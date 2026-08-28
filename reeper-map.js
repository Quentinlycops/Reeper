(function () {
  "use strict";

  var LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
  var LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

  function fixDefaultIcon() {
    var L = window.L;
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
    });
  }

  function ensureLeaflet() {
    if (window.L) return Promise.resolve();
    if (window.__reeperLeafletPromise) return window.__reeperLeafletPromise;
    window.__reeperLeafletPromise = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = LEAFLET_JS;
      s.onload = function () { fixDefaultIcon(); resolve(); };
      s.onerror = function () { reject(new Error("leaflet failed to load")); };
      document.head.appendChild(s);
    });
    return window.__reeperLeafletPromise;
  }

  var stylesheet =
    ":host{display:block;position:relative;width:100%;height:100%;aspect-ratio:16/10;background:#E9EFF3}" +
    ".wrap{position:absolute;inset:0}" +
    ".attr{position:absolute;bottom:6px;right:8px;font-size:9.5px;color:#5A6B7E;background:rgba(255,255,255,.8);border-radius:4px;padding:2px 6px;z-index:1000;pointer-events:none}" +
    ".leaflet-container{background:#E9EFF3;font-family:inherit}";

  class ReeperMapEl extends HTMLElement {
    static get observedAttributes() { return ["center", "zoom", "markers", "draggable-marker", "click-to-place"]; }

    constructor() {
      super();
      var root = this.attachShadow({ mode: "open" });
      root.innerHTML =
        "<style>" + stylesheet + "</style>" +
        '<link rel="stylesheet" href="' + LEAFLET_CSS + '">' +
        '<div class="wrap"><div class="map" style="width:100%;height:100%"></div></div>' +
        '<span class="attr">© OpenStreetMap · CARTO</span>';
      this._container = root.querySelector(".map");
      this._map = null;
      this._layer = null;
      this._marker = null;
      this._ro = new ResizeObserver(function () { this._invalidate(); }.bind(this));
    }

    connectedCallback() {
      var self = this;
      ensureLeaflet().then(function () {
        if (!self.isConnected) return;
        self._init();
      }).catch(function (e) { console.error("[reeper-map]", e); });
      this._ro.observe(this);
    }

    disconnectedCallback() {
      this._ro.disconnect();
      if (this._map) { this._map.remove(); this._map = null; }
    }

    _parseCenter() {
      var raw = this.getAttribute("center") || "";
      var parts = raw.split(",").map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return parts;
      return [46.3833, 6.2394];
    }

    _init() {
      var L = window.L;
      if (this._map || !this._container) return;
      var self = this;
      var center = this._parseCenter();
      var zoom = parseFloat(this.getAttribute("zoom")) || 15;
      this._map = L.map(this._container, { zoomControl: true, scrollWheelZoom: false }).setView(center, zoom);
      L.tileLayer("https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors &copy; CARTO"
      }).addTo(this._map);
      this._layer = L.layerGroup().addTo(this._map);
      this._renderMarkers();
      this._renderDraggable();
      this._container.addEventListener("wheel", function (e) {
        if (!(e.ctrlKey || e.metaKey)) return;
        e.preventDefault();
        self._map.setZoom(self._map.getZoom() + (e.deltaY < 0 ? 1 : -1), { animate: false });
      }, { passive: false });
      if (this.hasAttribute("click-to-place")) {
        this._map.on("click", function (e) {
          self._placeDraggable(e.latlng.lat, e.latlng.lng);
          self.dispatchEvent(new CustomEvent("reeper-map:marker-moved", {
            bubbles: true, composed: true, detail: { lat: e.latlng.lat, lon: e.latlng.lng }
          }));
        });
      }
      setTimeout(function () { self._invalidate(); }, 50);
    }

    _invalidate() {
      if (this._map) this._map.invalidateSize();
    }

    invalidate() {
      this._invalidate();
    }

    attributeChangedCallback(name) {
      if (!this._map) return;
      if (name === "center" || name === "zoom") {
        this._map.setView(this._parseCenter(), parseFloat(this.getAttribute("zoom")) || this._map.getZoom());
      } else if (name === "markers") {
        this._renderMarkers();
      } else if (name === "draggable-marker") {
        this._renderDraggable();
      }
    }

    _renderMarkers() {
      var L = window.L;
      if (!this._layer) return;
      this._layer.clearLayers();
      var raw = this.getAttribute("markers");
      if (!raw) return;
      var list;
      try { list = JSON.parse(raw); } catch (e) { return; }
      var self = this;
      list.forEach(function (m) {
        var cm = L.circleMarker([m.lat, m.lon], {
          radius: m.size || 10, color: "#fff", weight: 2.5,
          fillColor: m.color || "#D62839", fillOpacity: 1
        });
        if (m.label) cm.bindTooltip(String(m.label), { direction: "top", offset: [0, -6] });
        cm.on("click", function () {
          self.dispatchEvent(new CustomEvent("reeper-map:marker-click", {
            bubbles: true, composed: true, detail: { id: m.id }
          }));
        });
        cm.addTo(self._layer);
      });
    }

    _renderDraggable() {
      var L = window.L;
      if (!this._map) return;
      var want = this.hasAttribute("draggable-marker");
      if (!want) {
        if (this._marker) { this._map.removeLayer(this._marker); this._marker = null; }
        return;
      }
      var center = this._parseCenter();
      this._placeDraggable(center[0], center[1]);
    }

    _placeDraggable(lat, lon) {
      var L = window.L;
      if (!this._map) return;
      if (this._marker) {
        this._marker.setLatLng([lat, lon]);
        return;
      }
      var self = this;
      this._marker = L.marker([lat, lon], { draggable: true }).addTo(this._map);
      this._marker.on("dragend", function () {
        var ll = self._marker.getLatLng();
        self.dispatchEvent(new CustomEvent("reeper-map:marker-moved", {
          bubbles: true, composed: true, detail: { lat: ll.lat, lon: ll.lng }
        }));
      });
    }

    panTo(lat, lon, zoom) {
      if (!this._map) return;
      this._map.setView([lat, lon], zoom || this._map.getZoom());
      this._placeDraggable(lat, lon);
    }
  }

  customElements.define("reeper-map", ReeperMapEl);
})();

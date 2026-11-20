import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const countryCenters = {
  US:[39.8,-98.6], CA:[56.1,-106.3], MX:[23.6,-102.5], BR:[-10.8,-52.9],
  AR:[-38.4,-63.6], MA:[31.8,-7.1], TN:[34.0,9.0], FR:[46.2,2.2],
  ES:[40.2,-3.7], IT:[41.9,12.6], TR:[39.0,35.2], EG:[26.8,30.8],
  KE:[0.2,37.9], ZA:[-29.0,24.0], AE:[24.2,53.8], KW:[29.3,47.5],
  IN:[22.8,79.0], CN:[35.9,104.2], JP:[36.2,138.3], AU:[-25.3,133.8],
  NZ:[-41.3,174.8]
};

export function mountBuyerOriginMap(element, origins, {
  countryLabel,
  countryFlag,
  onSelect,
  onTileError
}) {
  if (!element) throw new TypeError('A map container is required.');
  if (typeof countryLabel !== 'function' || typeof countryFlag !== 'function' ||
      typeof onSelect !== 'function') {
    throw new TypeError('Map labels and origin selection handlers are required.');
  }

  const map = L.map(element,{scrollWheelZoom:false,keyboard:true,worldCopyJump:true})
    .setView([22,12],2);
  const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:19,
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    updateWhenIdle:true,
    keepBuffer:2
  }).addTo(map);
  tiles.on('tileerror',() => onTileError?.());

  for (const [code,count] of origins) {
    const coordinates = countryCenters[code];
    if (!coordinates) continue;
    const label = countryLabel(code);
    const marker = L.marker(coordinates,{
      keyboard:true,
      title:`${label}, ${count}`,
      icon:L.divIcon({
        className:'buyer-map-marker',
        html:`<span aria-hidden="true">${countryFlag(code)}</span><b aria-hidden="true">${count}</b>`,
        iconSize:[48,32],
        iconAnchor:[24,16]
      })
    }).addTo(map);
    marker.bindTooltip(`${label} · ${count}`);
    marker.on('click',() => onSelect(code));
    marker.on('add',() => {
      const icon = marker.getElement();
      if (icon) {
        icon.setAttribute('role','button');
        icon.setAttribute('aria-label',`${label}, ${count}`);
      }
    });
  }

  return map;
}

export function hasBuyerOriginMapCoordinates(code) {
  return Object.prototype.hasOwnProperty.call(countryCenters,code);
}

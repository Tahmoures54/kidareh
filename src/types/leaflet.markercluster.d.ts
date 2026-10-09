import "leaflet";

declare module "leaflet" {
  interface MarkerClusterLike {
    getChildCount(): number;
  }

  interface MarkerClusterGroupOptions extends LayerOptions {
    showCoverageOnHover?: boolean;
    zoomToBoundsOnClick?: boolean;
    spiderfyOnMaxZoom?: boolean;
    removeOutsideVisibleBounds?: boolean;
    maxClusterRadius?: number;
    iconCreateFunction?: (cluster: MarkerClusterLike) => DivIcon;
  }

  interface MarkerClusterGroup extends FeatureGroup {}

  function markerClusterGroup(options?: MarkerClusterGroupOptions): MarkerClusterGroup;
}

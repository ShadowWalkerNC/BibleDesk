'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { 
  type MissionMapPin, 
  DEFAULT_MAP_PINS, 
  CATEGORY_COLORS, 
  getCategoryMeta 
} from '@/types/map';
import { 
  ShieldAlert, 
  Sparkles, 
  MapPin, 
  Heart, 
  MessageCircle, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  X 
} from 'lucide-react';
import styles from './PrayerAtlas.module.css';

export interface PrayerAtlasProps {
  pins?: MissionMapPin[];
  selectedPinId?: string | null;
  onSelectPin?: (pin: MissionMapPin) => void;
  onPray?: (pin: MissionMapPin) => void;
  onFollowup?: (pin: MissionMapPin) => void;
}

const WIDTH = 960;
const HEIGHT = 500;

export default function PrayerAtlas({ 
  pins = DEFAULT_MAP_PINS, 
  selectedPinId, 
  onSelectPin,
  onPray,
  onFollowup
}: PrayerAtlasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const [worldData, setWorldData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [hoveredPin, setHoveredPin] = useState<MissionMapPin | null>(null);
  const [activePin, setActivePin] = useState<MissionMapPin | null>(null);
  const [prayedPins, setPrayedPins] = useState<Record<string, boolean>>({});

  // 1. Load local offline TopoJSON world data
  useEffect(() => {
    fetch('/data/world-110m.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const countriesGeo = topojson.feature(data, data.objects.countries);
        setWorldData(countriesGeo);
        setLoading(false);
      })
      .catch((err) => {
        console.warn('Could not load local world-110m.json, attempting fallback:', err);
        fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
          .then((res) => res.json())
          .then((data) => {
            const countriesGeo = topojson.feature(data, data.objects.countries);
            setWorldData(countriesGeo);
            setLoading(false);
          })
          .catch((cdnErr) => {
            console.error('Failed to load world map data from both local and CDN:', cdnErr);
            setLoading(false);
          });
      });
  }, []);

  // 2. Sync activePin when selectedPinId prop changes
  useEffect(() => {
    if (!selectedPinId) {
      setActivePin(null);
      return;
    }
    const matched = pins.find(p => p.id === selectedPinId);
    if (matched) {
      setActivePin(matched);
    }
  }, [selectedPinId, pins]);

  // 3. Natural Earth Projection & Path Generator (2D vector, no 3D loop)
  const projection = useMemo(() => {
    return d3.geoNaturalEarth1().fitSize([WIDTH, HEIGHT], { type: 'Sphere' });
  }, []);

  const pathGenerator = useMemo(() => {
    return d3.geoPath().projection(projection);
  }, [projection]);

  const graticuleData = useMemo(() => {
    return d3.geoGraticule()();
  }, []);

  // 4. D3 Zoom & Pan Setup
  useEffect(() => {
    const svg = svgRef.current;
    const g = gRef.current;
    if (!svg || !g) return;

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 8])
      .translateExtent([[0, 0], [WIDTH, HEIGHT]])
      .on('zoom', (event) => {
        d3.select(g).attr('transform', event.transform.toString());
      });

    d3.select(svg).call(zoom);
    zoomBehaviorRef.current = zoom;

    return () => {
      d3.select(svg).on('.zoom', null);
    };
  }, []);

  const handleZoomIn = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(250).call(zoomBehaviorRef.current.scaleBy, 1.35);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(250).call(zoomBehaviorRef.current.scaleBy, 0.74);
    }
  };

  const handleResetZoom = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
    }
  };

  // 5. Category Counts & Filtered Pins
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: pins.length };
    for (const pin of pins) {
      const key = pin.isRestricted ? 'restricted' : (pin.category || 'other').toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [pins]);

  const filteredPins = useMemo(() => {
    if (selectedCategory === 'all') return pins;
    return pins.filter(pin => {
      const key = pin.isRestricted ? 'restricted' : (pin.category || 'other').toLowerCase();
      return key === selectedCategory;
    });
  }, [pins, selectedCategory]);

  const handlePinClick = useCallback((pin: MissionMapPin) => {
    setActivePin(pin);
    onSelectPin?.(pin);
  }, [onSelectPin]);

  return (
    <div className={styles.atlasContainer}>
      {/* ── Top Legend & Zoom Toolbar ─────────────────────────────── */}
      <div className={styles.mapToolbar}>
        <div className={styles.legendList} role="tablist" aria-label="Filter prayers by category">
          <button
            type="button"
            className={`${styles.legendChip} ${selectedCategory === 'all' ? styles.legendChipActive : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            <span>All Prayers</span>
            <span className={styles.legendCount}>({categoryCounts['all'] || 0})</span>
          </button>

          {Object.entries(CATEGORY_COLORS).map(([catKey, meta]) => {
            const count = categoryCounts[catKey] || 0;
            if (count === 0 && catKey !== 'restricted') return null;
            const isActive = selectedCategory === catKey;

            return (
              <button
                key={catKey}
                type="button"
                className={`${styles.legendChip} ${isActive ? styles.legendChipActive : ''}`}
                onClick={() => setSelectedCategory(catKey)}
              >
                <span
                  className={styles.legendColorDot}
                  style={{ backgroundColor: meta.color }}
                />
                <span>{meta.label}</span>
                <span className={styles.legendCount}>({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── SVG 2D Map Canvas ─────────────────────────────────────── */}
      <div className={styles.mapWrapper}>
        {/* Floating Zoom Controls (Standard mobile map pattern / Jakob's Law) */}
        <div className={styles.floatingZoomControls}>
          <button
            type="button"
            onClick={handleZoomIn}
            className={styles.zoomBtn}
            title="Zoom In"
            aria-label="Zoom In"
          >
            <ZoomIn size={16} />
          </button>
          <div className={styles.zoomDivider} />
          <button
            type="button"
            onClick={handleZoomOut}
            className={styles.zoomBtn}
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <ZoomOut size={16} />
          </button>
          <div className={styles.zoomDivider} />
          <button
            type="button"
            onClick={handleResetZoom}
            className={styles.zoomBtn}
            title="Reset Map View"
            aria-label="Reset Map View"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className={styles.mapSvg}
          role="img"
          aria-label="Interactive 2D World Prayer Atlas"
        >
          {/* Radial Gradient Defs for Category Halos */}
          <defs>
            {Object.entries(CATEGORY_COLORS).map(([key, meta]) => {
              const id = `halo-grad-${meta.color.replace('#', '')}`;
              return (
                <radialGradient id={id} key={id} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={meta.color} stopOpacity="0.4" />
                  <stop offset="35%" stopColor={meta.color} stopOpacity="0.2" />
                  <stop offset="70%" stopColor={meta.color} stopOpacity="0.06" />
                  <stop offset="100%" stopColor={meta.color} stopOpacity="0" />
                </radialGradient>
              );
            })}
          </defs>

          <g ref={gRef}>
            {/* 1. Ocean Background */}
            <path
              className={styles.oceanBg}
              d={pathGenerator({ type: 'Sphere' }) || ''}
            />

            {/* 2. Graticule Lat/Lng Coordinate Lines */}
            <path
              className={styles.graticulePath}
              d={pathGenerator(graticuleData) || ''}
            />

            {/* 3. Countries Vector Polygons */}
            {worldData?.features?.map((feature: any, idx: number) => (
              <path
                key={feature.id || idx}
                className={styles.countryPath}
                d={pathGenerator(feature) || ''}
              />
            ))}

            {/* 4. Active Prayer Pins & Highlight Areas */}
            {filteredPins.map((pin) => {
              const coords = projection([pin.longitude, pin.latitude]);
              if (!coords) return null;
              const [x, y] = coords;
              const meta = getCategoryMeta(pin.category, pin.isRestricted);
              const isSelected = activePin?.id === pin.id;
              const isApproximate = pin.privacy_mode === 'approximate';
              const isRestricted = pin.isRestricted || pin.privacy_mode === 'restricted';
              const gradId = `halo-grad-${meta.color.replace('#', '')}`;

              return (
                <g
                  key={pin.id}
                  className={styles.pinGroup}
                  onClick={() => handlePinClick(pin)}
                  onMouseEnter={() => setHoveredPin(pin)}
                  onMouseLeave={() => setHoveredPin(null)}
                  role="button"
                  aria-label={`${pin.label}: ${pin.category}`}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handlePinClick(pin);
                    }
                  }}
                >
                  {/* Approximate Highlight: Soft glowing radial boundary */}
                  {isApproximate && (
                    <circle
                      cx={x}
                      cy={y}
                      r={36}
                      fill={`url(#${gradId})`}
                      className={styles.approximateHalo}
                    />
                  )}

                  {/* Restricted Area Protection Shield Gradient */}
                  {isRestricted && (
                    <circle
                      cx={x}
                      cy={y}
                      r={26}
                      fill="url(#halo-grad-dc2626)"
                      className={styles.approximateHalo}
                    />
                  )}

                  {/* Selected Aura Ring */}
                  {isSelected && (
                    <circle
                      cx={x}
                      cy={y}
                      r={15}
                      fill="none"
                      stroke="#b58414"
                      strokeWidth="2.2"
                      strokeDasharray="4 2"
                    />
                  )}

                  {/* Pulse Beacon Ring */}
                  {(!isApproximate || isSelected) && (
                    <circle
                      cx={x}
                      cy={y}
                      r={10}
                      stroke={meta.color}
                      strokeWidth="1.5"
                      fill="none"
                      className={styles.pulseRing}
                    />
                  )}

                  {/* Pin Base Marker */}
                  {isRestricted ? (
                    <g transform={`translate(${x - 9}, ${y - 9})`}>
                      <circle cx="9" cy="9" r="9" fill="#dc2626" stroke="#ffffff" strokeWidth="1.5" />
                      <path
                        d="M9 4.5 L13 6.2 V9.5 C13 12 11.2 13.5 9 14.5 C6.8 13.5 5 12 5 9.5 V6.2 Z"
                        fill="#ffffff"
                      />
                    </g>
                  ) : isApproximate ? (
                    <>
                      <circle
                        cx={x}
                        cy={y}
                        r={6.5}
                        fill="#ffffff"
                        stroke={meta.color}
                        strokeWidth="2"
                      />
                      <circle
                        cx={x}
                        cy={y}
                        r={3.2}
                        fill={meta.color}
                      />
                    </>
                  ) : (
                    <>
                      <circle
                        cx={x}
                        cy={y}
                        r={6}
                        fill="#ffffff"
                        stroke={meta.color}
                        strokeWidth="2.4"
                      />
                      <circle
                        cx={x}
                        cy={y}
                        r={3}
                        fill={meta.color}
                      />
                    </>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* ── Hover Tooltip (Desktop quick peek) ──────────────────── */}
        {hoveredPin && !activePin && (
          <div className={styles.hoverTooltip}>
            <div className={styles.tooltipHeader}>
              <span
                className={styles.tooltipCategory}
                style={{
                  backgroundColor: getCategoryMeta(hoveredPin.category, hoveredPin.isRestricted).bg,
                  color: getCategoryMeta(hoveredPin.category, hoveredPin.isRestricted).color,
                  border: `1px solid ${getCategoryMeta(hoveredPin.category, hoveredPin.isRestricted).border}`
                }}
              >
                {getCategoryMeta(hoveredPin.category, hoveredPin.isRestricted).label}
              </span>
              <span className={styles.tooltipHint}>Click to view &amp; pray</span>
            </div>
            <div className={styles.tooltipLabel}>{hoveredPin.label}</div>
            <p className={styles.tooltipText}>{hoveredPin.text}</p>
          </div>
        )}
      </div>

      {/* ── Selected Pin Bottom Action Sheet / Card (Jakob's Law Mobile) ── */}
      {activePin && (
        <div className={styles.selectedCard}>
          <div className={styles.selectedCardHeader}>
            <div className={styles.selectedTitleRow}>
              <div className={styles.selectedBadgeRow}>
                <span
                  className={styles.selectedCategoryBadge}
                  style={{
                    backgroundColor: getCategoryMeta(activePin.category, activePin.isRestricted).bg,
                    color: getCategoryMeta(activePin.category, activePin.isRestricted).color,
                    border: `1px solid ${getCategoryMeta(activePin.category, activePin.isRestricted).border}`
                  }}
                >
                  {getCategoryMeta(activePin.category, activePin.isRestricted).label}
                </span>

                <span className={styles.selectedPrivacyBadge}>
                  {activePin.isRestricted ? (
                    <>
                      <ShieldAlert size={12} />
                      <span>Restricted Shield</span>
                    </>
                  ) : activePin.privacy_mode === 'approximate' ? (
                    <>
                      <MapPin size={12} />
                      <span>Approximate Region</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={12} />
                      <span>Precise Location</span>
                    </>
                  )}
                </span>
              </div>
              <h3 className={styles.selectedTitle}>{activePin.label}</h3>
            </div>

            <button
              type="button"
              className={styles.closeCardBtn}
              onClick={() => setActivePin(null)}
              title="Close prayer card"
              aria-label="Close prayer card"
            >
              <X size={18} />
            </button>
          </div>

          <p className={styles.selectedText}>{activePin.text}</p>

          <div className={styles.selectedActions}>
            <button
              type="button"
              className={styles.prayActionBtn}
              onClick={() => {
                setPrayedPins(prev => ({ ...prev, [activePin.id]: true }));
                onPray?.(activePin);
              }}
            >
              <Heart size={16} fill={prayedPins[activePin.id] ? '#ffffff' : 'none'} />
              <span>{prayedPins[activePin.id] ? 'Prayed in Spirit' : 'Pray for This Beacon'}</span>
            </button>

            <button
              type="button"
              className={styles.followupActionBtn}
              onClick={() => onFollowup?.(activePin)}
            >
              <MessageCircle size={16} />
              <span>Pastoral Care Follow-up</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

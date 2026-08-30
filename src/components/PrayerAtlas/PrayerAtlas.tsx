'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { type MissionMapPin, DEFAULT_MAP_PINS } from '@/types/map';
import { Globe, RotateCw, Pause, Play, ShieldAlert, Sparkles } from 'lucide-react';
import styles from './PrayerAtlas.module.css';

interface PrayerAtlasProps {
  pins?: MissionMapPin[];
  selectedPinId?: string | null;
  onSelectPin?: (pin: MissionMapPin) => void;
}

export default function PrayerAtlas({ pins = DEFAULT_MAP_PINS, selectedPinId, onSelectPin }: PrayerAtlasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [worldData, setWorldData] = useState<any>(null);
  const [rotation, setRotation] = useState<[number, number]>([-10, -20]);
  const [hoveredPin, setHoveredPin] = useState<MissionMapPin | null>(null);
  const [isRotating, setIsRotating] = useState(true);

  // Fetch world geometries once
  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then((res) => res.json())
      .then((data) => {
        const countriesGeo = topojson.feature(data, data.objects.countries);
        setWorldData(countriesGeo);
      })
      .catch((err) => console.error('Failed to load world map data:', err));
  }, []);

  // When selectedPinId changes, smoothly rotate globe to face that pin
  useEffect(() => {
    if (!selectedPinId) return;
    const targetPin = pins.find(p => p.id === selectedPinId);
    if (targetPin) {
      setIsRotating(false);
      setRotation([-targetPin.longitude, -targetPin.latitude]);
    }
  }, [selectedPinId, pins]);

  // Spin animation handler
  useEffect(() => {
    if (!isRotating) return;
    let animationId: number;

    const tick = () => {
      setRotation(([lambda, phi]) => [(lambda + 0.22) % 360, phi]);
      animationId = requestAnimationFrame(tick);
    };

    animationId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationId);
  }, [isRotating]);

  // Handle Drag/Pan & Clicks on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let isMouseDown = false;
    let lastX = 0;
    let lastY = 0;
    let hasDragged = false;

    const onMouseDown = (e: MouseEvent) => {
      isMouseDown = true;
      hasDragged = false;
      setIsRotating(false);
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
      const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);

      const projection = d3.geoOrthographic()
        .fitSize([canvas.width, canvas.height], { type: 'Sphere' })
        .rotate([rotation[0], rotation[1], 0]);

      if (!isMouseDown) {
        // Detect hover over pins
        let matched: MissionMapPin | null = null;
        for (const pin of pins) {
          const coords = projection([pin.longitude, pin.latitude]);
          if (coords) {
            const dx = mouseX - coords[0];
            const dy = mouseY - coords[1];
            const distance = Math.sqrt(dx * dx + dy * dy);

            const path = d3.geoPath().projection(projection);
            const visible = path({
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [pin.longitude, pin.latitude] },
              properties: {}
            });

            if (distance < 14 && visible) {
              matched = pin;
              break;
            }
          }
        }
        setHoveredPin(matched);
        return;
      }

      hasDragged = true;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;

      setRotation(([lambda, phi]) => [
        lambda + dx * 0.35,
        Math.max(-85, Math.min(85, phi - dy * 0.35))
      ]);

      lastX = e.clientX;
      lastY = e.clientY;
    };

    const onMouseUp = (e: MouseEvent) => {
      isMouseDown = false;
      if (!hasDragged) {
        // Handle direct click
        const rect = canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
        const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);

        const projection = d3.geoOrthographic()
          .fitSize([canvas.width, canvas.height], { type: 'Sphere' })
          .rotate([rotation[0], rotation[1], 0]);

        for (const pin of pins) {
          const coords = projection([pin.longitude, pin.latitude]);
          if (coords) {
            const dx = mouseX - coords[0];
            const dy = mouseY - coords[1];
            const distance = Math.sqrt(dx * dx + dy * dy);

            const path = d3.geoPath().projection(projection);
            const visible = path({
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [pin.longitude, pin.latitude] },
              properties: {}
            });

            if (distance < 16 && visible) {
              onSelectPin?.(pin);
              break;
            }
          }
        }
      }
    };

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [rotation, pins, onSelectPin]);

  // Main Canvas Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !worldData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.clearRect(0, 0, width, height);

    // Setup Orthographic Projection
    const projection = d3.geoOrthographic()
      .fitSize([width, height], { type: 'Sphere' })
      .rotate([rotation[0], rotation[1], 0]);

    const path = d3.geoPath().projection(projection).context(ctx);

    // 1. Draw Globe Sphere backdrop (Warm Parchment Ocean)
    ctx.beginPath();
    path({ type: 'Sphere' });
    const oceanGrad = ctx.createRadialGradient(width / 2 - 40, height / 2 - 40, 10, width / 2, height / 2, width / 2);
    oceanGrad.addColorStop(0, '#fbf8f0');
    oceanGrad.addColorStop(0.7, '#ede3d0');
    oceanGrad.addColorStop(1, '#dbcdb4');
    ctx.fillStyle = oceanGrad;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(181, 132, 20, 0.45)';
    ctx.stroke();

    // 2. Draw countries (Illuminated Parchment Land)
    ctx.beginPath();
    path(worldData);
    ctx.fillStyle = '#c7b99f'; // Aged vellum continent fill
    ctx.fill();
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = '#f5efe0';
    ctx.stroke();

    // 3. Draw grid lines (graticule)
    const graticule = d3.geoGraticule();
    ctx.beginPath();
    path(graticule());
    ctx.strokeStyle = 'rgba(181, 132, 20, 0.18)';
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // 4. Draw pin markers
    for (const pin of pins) {
      const coords = projection([pin.longitude, pin.latitude]);
      if (coords) {
        ctx.beginPath();
        const isVisible = path({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [pin.longitude, pin.latitude] },
          properties: {}
        });

        if (isVisible) {
          const x = coords[0];
          const y = coords[1];
          const isSelected = pin.id === selectedPinId;
          const isHovered = hoveredPin?.id === pin.id;

          // Selected pulsing halo
          if (isSelected || isHovered) {
            ctx.beginPath();
            ctx.arc(x, y, 14, 0, 2 * Math.PI);
            ctx.fillStyle = pin.isRestricted ? 'rgba(184, 29, 88, 0.28)' : 'rgba(181, 132, 20, 0.32)';
            ctx.fill();
          }

          // Outer beacon ring
          ctx.beginPath();
          ctx.arc(x, y, isSelected ? 8 : 6, 0, 2 * Math.PI);
          ctx.fillStyle = pin.isRestricted ? 'rgba(184, 29, 88, 0.45)' : 'rgba(181, 132, 20, 0.45)';
          ctx.fill();
          ctx.lineWidth = 1.2;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();

          // Center core dot
          ctx.beginPath();
          ctx.arc(x, y, isSelected ? 4.5 : 3.5, 0, 2 * Math.PI);
          ctx.fillStyle = pin.isRestricted ? '#b81d58' : '#b58414';
          ctx.fill();
        }
      }
    }
  }, [worldData, rotation, pins, selectedPinId, hoveredPin]);

  return (
    <div className={styles.atlasContainer}>
      <div className={styles.canvasWrapper}>
        <canvas
          ref={canvasRef}
          width={600}
          height={600}
          style={{ cursor: hoveredPin ? 'pointer' : 'grab' }}
          className={styles.globeCanvas}
        />

        {/* Interactive Globe Controls */}
        <div className={styles.controls}>
          <button
            onClick={() => setIsRotating(!isRotating)}
            className={styles.controlBtn}
            title={isRotating ? 'Pause auto-rotation' : 'Resume auto-rotation'}
          >
            {isRotating ? <Pause size={14} /> : <Play size={14} />}
            <span>{isRotating ? 'Pause' : 'Spin'}</span>
          </button>
          <button
            onClick={() => setRotation([-10, -20])}
            className={styles.controlBtn}
            title="Reset to center view"
          >
            <RotateCw size={14} />
            <span>Reset</span>
          </button>
        </div>
      </div>
      
      {/* Floating Hover Tooltip */}
      {hoveredPin && (
        <div className={styles.hoverTooltip}>
          <div className={styles.tooltipHeader}>
            <span className={hoveredPin.isRestricted ? styles.restrictedBadge : styles.openBadge}>
              {hoveredPin.isRestricted ? (
                <>
                  <ShieldAlert size={12} style={{ verticalAlign: 'middle', marginRight: '3px' }} />
                  Restricted Region
                </>
              ) : (
                <>
                  <Sparkles size={12} style={{ verticalAlign: 'middle', marginRight: '3px' }} />
                  {hoveredPin.category.toUpperCase()}
                </>
              )}
            </span>
            <span className={styles.tooltipLabel}>{hoveredPin.label}</span>
          </div>
          <p className={styles.tooltipText}>{hoveredPin.text}</p>
          <span className={styles.tooltipHint}>Click pin to view prayer &amp; pray</span>
        </div>
      )}
    </div>
  );
}

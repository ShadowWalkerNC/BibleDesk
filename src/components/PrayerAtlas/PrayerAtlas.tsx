'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { type MissionMapPin, DEFAULT_MAP_PINS } from '@/types/map';
import styles from './PrayerAtlas.module.css';

interface PrayerAtlasProps {
  pins?: MissionMapPin[];
  onSelectPin?: (pin: MissionMapPin) => void;
}

export default function PrayerAtlas({ pins = DEFAULT_MAP_PINS, onSelectPin }: PrayerAtlasProps) {
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

  // Spin animation handler
  useEffect(() => {
    if (!isRotating) return;
    let animationId: number;

    const tick = () => {
      setRotation(([lambda, phi]) => [lambda + 0.18, phi]);
      animationId = requestAnimationFrame(tick);
    };

    animationId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationId);
  }, [isRotating]);

  // Handle Drag/Pan Rotation on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let isMouseDown = false;
    let lastX = 0;
    let lastY = 0;

    const onMouseDown = (e: MouseEvent) => {
      isMouseDown = true;
      setIsRotating(false);
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isMouseDown) {
        // Detect hover over pins
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const projection = d3.geoOrthographic()
          .fitSize([canvas.width, canvas.height], { type: 'Sphere' })
          .rotate([rotation[0], rotation[1], 0]);

        let matched: MissionMapPin | null = null;
        for (const pin of pins) {
          const coords = projection([pin.longitude, pin.latitude]);
          if (coords) {
            const dx = mouseX - coords[0];
            const dy = mouseY - coords[1];
            const distance = Math.sqrt(dx * dx + dy * dy);

            // If within projection circle and visible (not on the back side of earth)
            const path = d3.geoPath().projection(projection);
            const visible = path({
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [pin.longitude, pin.latitude] },
              properties: {}
            });

            if (distance < 10 && visible) {
              matched = pin;
              break;
            }
          }
        }
        setHoveredPin(matched);
        return;
      }

      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;

      setRotation(([lambda, phi]) => [
        lambda + dx * 0.25,
        Math.max(-85, Math.min(85, phi - dy * 0.25))
      ]);

      lastX = e.clientX;
      lastY = e.clientY;
    };

    const onMouseUp = () => {
      isMouseDown = false;
    };

    const onMouseClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

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

          if (distance < 10 && visible) {
            onSelectPin?.(pin);
            break;
          }
        }
      }
    };

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('click', onMouseClick);

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('click', onMouseClick);
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

    // Setup Orthographic Projection projection
    const projection = d3.geoOrthographic()
      .fitSize([width, height], { type: 'Sphere' })
      .rotate([rotation[0], rotation[1], 0]);

    const path = d3.geoPath().projection(projection).context(ctx);

    // 1. Draw Globe Sphere backdrop
    ctx.beginPath();
    path({ type: 'Sphere' });
    ctx.fillStyle = '#f7f4eb'; // Light parchment water color
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#e0dacf';
    ctx.stroke();

    // 2. Draw countries outline
    ctx.beginPath();
    path(worldData);
    ctx.fillStyle = '#dfd9cc'; // Warm beige land color
    ctx.fill();
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = '#fbf9f4';
    ctx.stroke();

    // 3. Draw grid lines (graticule)
    const graticule = d3.geoGraticule();
    ctx.beginPath();
    path(graticule());
    ctx.strokeStyle = 'rgba(200, 190, 175, 0.15)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // 4. Draw pin markers
    for (const pin of pins) {
      const coords = projection([pin.longitude, pin.latitude]);
      if (coords) {
        // Validate if pin coordinate is on front/visible hemisphere of rotation
        ctx.beginPath();
        const isVisible = path({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [pin.longitude, pin.latitude] },
          properties: {}
        });

        if (isVisible) {
          const x = coords[0];
          const y = coords[1];

          // Draw outer pulsing rings
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, 2 * Math.PI);
          ctx.fillStyle = pin.isRestricted ? 'rgba(239, 68, 68, 0.25)' : 'rgba(79, 156, 249, 0.25)';
          ctx.fill();

          // Draw center pin core dot
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, 2 * Math.PI);
          ctx.fillStyle = pin.isRestricted ? '#ef4444' : '#4f9cf9';
          ctx.fill();
        }
      }
    }
  }, [worldData, rotation, pins]);

  return (
    <div className={styles.atlasContainer}>
      <div className={styles.canvasWrapper}>
        <canvas
          ref={canvasRef}
          width={500}
          height={500}
          style={{ cursor: hoveredPin ? 'pointer' : 'grab' }}
          className={styles.globeCanvas}
        />
        <div className={styles.controls}>
          <button
            onClick={() => setIsRotating(!isRotating)}
            className={styles.controlBtn}
          >
            {isRotating ? 'Pause Rotation' : 'Resume Rotation'}
          </button>
        </div>
      </div>
      
      {hoveredPin && (
        <div className={styles.hoverTooltip}>
          <div className={styles.tooltipHeader}>
            <span className={hoveredPin.isRestricted ? styles.restrictedBadge : styles.openBadge}>
              {hoveredPin.isRestricted ? 'Restricted Region' : hoveredPin.category.toUpperCase()}
            </span>
            <span className={styles.tooltipLabel}>{hoveredPin.label}</span>
          </div>
          <p className={styles.tooltipText}>{hoveredPin.text}</p>
        </div>
      )}
    </div>
  );
}

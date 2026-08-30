'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

interface SacredHaloProps {
  tintColor?: string;
  intensity?: number;
}

function CelestialRings({ tintColor = '#b58414' }: { tintColor?: string }) {
  const outerRingRef = useRef<THREE.Mesh>(null);
  const innerRingRef = useRef<THREE.Mesh>(null);
  const coreOrbRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (outerRingRef.current) {
      outerRingRef.current.rotation.x = Math.sin(t * 0.3) * 0.4 + 0.3;
      outerRingRef.current.rotation.y = t * 0.25;
      outerRingRef.current.rotation.z = Math.cos(t * 0.2) * 0.2;
    }
    if (innerRingRef.current) {
      innerRingRef.current.rotation.x = -t * 0.35;
      innerRingRef.current.rotation.y = Math.cos(t * 0.4) * 0.5;
    }
    if (coreOrbRef.current) {
      const s = 1 + Math.sin(t * 1.5) * 0.06;
      coreOrbRef.current.scale.set(s, s, s);
    }
  });

  return (
    <Float speed={2.5} rotationIntensity={0.6} floatIntensity={0.8}>
      <group position={[0, 0, 0]}>
        {/* Core Sacred Orb */}
        <mesh ref={coreOrbRef}>
          <octahedronGeometry args={[0.75, 2]} />
          <meshStandardMaterial
            color={tintColor}
            emissive={tintColor}
            emissiveIntensity={0.35}
            roughness={0.2}
            metalness={0.85}
            wireframe={false}
          />
        </mesh>

        {/* Outer Celestial Ring */}
        <mesh ref={outerRingRef}>
          <torusGeometry args={[1.5, 0.025, 16, 100]} />
          <meshStandardMaterial
            color="#b58414"
            emissive="#b58414"
            emissiveIntensity={0.5}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>

        {/* Inner Counter-Rotating Ring */}
        <mesh ref={innerRingRef}>
          <torusGeometry args={[1.15, 0.02, 16, 80]} />
          <meshStandardMaterial
            color="#d4af37"
            emissive="#d4af37"
            emissiveIntensity={0.6}
            metalness={0.95}
            roughness={0.1}
          />
        </mesh>
      </group>
    </Float>
  );
}

export default function SacredHaloCanvas({ tintColor = '#b58414' }: SacredHaloProps) {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: '180px', position: 'relative', pointerEvents: 'none' }}>
      <Canvas
        camera={{ position: [0, 0, 4.2], fov: 45 }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={1.2} />
        <pointLight position={[5, 5, 5]} intensity={2} color="#fff8e7" />
        <pointLight position={[-4, -3, 2]} intensity={1.5} color={tintColor} />
        
        <CelestialRings tintColor={tintColor} />
        
        <Sparkles
          count={50}
          scale={3.8}
          size={2.2}
          speed={0.45}
          opacity={0.7}
          color="#b58414"
        />
      </Canvas>
    </div>
  );
}

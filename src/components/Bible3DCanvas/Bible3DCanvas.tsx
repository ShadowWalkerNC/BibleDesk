'use client';

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

function SacredBookModel() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.4) * 0.25;
      meshRef.current.rotation.x = Math.cos(state.clock.elapsedTime * 0.3) * 0.1;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.8}>
      <group>
        {/* Book Cover Mesh */}
        <mesh ref={meshRef} position={[0, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.2, 3.2, 0.45]} />
          <MeshDistortMaterial
            color="#b58414"
            roughness={0.25}
            metalness={0.85}
            distort={0.08}
            speed={1.5}
          />
        </mesh>
        
        {/* Page Edge Inset Mesh */}
        <mesh position={[0.08, 0, 0]}>
          <boxGeometry args={[2.0, 3.0, 0.38]} />
          <meshStandardMaterial color="#f7f3e8" roughness={0.6} />
        </mesh>
      </group>
    </Float>
  );
}

export default function Bible3DCanvas() {
  return (
    <div style={{ width: '100%', height: '240px', position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[5, 8, 5]} intensity={1.5} color="#fff8e7" />
        <pointLight position={[-4, -2, -2]} intensity={0.8} color="#b58414" />
        
        <SacredBookModel />
        
        <Sparkles
          count={40}
          scale={4.5}
          size={2.5}
          speed={0.4}
          opacity={0.6}
          color="#b58414"
        />
      </Canvas>
    </div>
  );
}

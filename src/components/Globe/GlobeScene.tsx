'use client';
import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';
import { GlobalEvent } from '@/lib/types';

interface GlobeSceneProps {
  events: GlobalEvent[];
  onEventSelect: (event: GlobalEvent) => void;
  selectedEvent: GlobalEvent | null;
}

function GlobeCore() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.001;
    }
  });

  return (
    <Sphere ref={meshRef} args={[2, 64, 64]}>
      <meshStandardMaterial
        color="#0a1628"
        metalness={0.8}
        roughness={0.3}
        wireframe={false}
        emissive="#001122"
        emissiveIntensity={0.2}
      />
    </Sphere>
  );
}

function EventMarker({ event, isSelected, onClick }: { 
  event: GlobalEvent; 
  isSelected: boolean;
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const isHovered = useRef(false);
  
  const lat = event.location.lat;
  const lng = event.location.lng;
  const radius = 2.05;
  
  const position = useMemo(() => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    return new THREE.Vector3(
      -radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }, [lat, lng]);

  const color = useMemo(() => {
    switch (event.severity) {
      case 'critical': return '#ef4444';
      case 'high': return '#f59e0b';
      case 'medium': return '#00d4ff';
      default: return '#10b981';
    }
  }, [event.severity]);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const scale = 1 + Math.sin(clock.elapsedTime * 2 + position.x) * 0.2;
      meshRef.current.scale.setScalar(isSelected ? 1.5 : scale);
    }
  });

  return (
    <mesh 
      ref={meshRef}
      position={position}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      <sphereGeometry args={[0.03, 16, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={2}
        transparent
        opacity={0.9}
      />
    </mesh>
  );
}

function GlobeWireframe() {
  return (
    <Sphere args={[2.02, 32, 32]}>
      <meshBasicMaterial color="#1e3a5f" wireframe opacity={0.3} transparent />
    </Sphere>
  );
}

export default function GlobeScene({ events, onEventSelect, selectedEvent }: GlobeSceneProps) {
  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <color attach="background" args={['#030810']} />
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#00d4ff" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#6366f1" />
        
        <GlobeCore />
        <GlobeWireframe />
        
        {events.map((event) => (
          <EventMarker
            key={event.id}
            event={event}
            isSelected={selectedEvent?.id === event.id}
            onClick={() => onEventSelect(event)}
          />
        ))}
        
        <OrbitControls 
          enablePan={false}
          minDistance={3}
          maxDistance={10}
          autoRotate
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
}

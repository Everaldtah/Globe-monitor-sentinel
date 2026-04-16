'use client';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GlobalEvent } from '@/lib/types';

interface GlobeSceneProps {
  events: GlobalEvent[];
  onEventSelect: (event: GlobalEvent) => void;
  selectedEvent: GlobalEvent | null;
}

function latLngToVector3(lat: number, lng: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function severityColor(severity: GlobalEvent['severity']) {
  switch (severity) {
    case 'critical': return 0xef4444;
    case 'high': return 0xf59e0b;
    case 'medium': return 0x00d4ff;
    default: return 0x10b981;
  }
}

export default function GlobeScene({ events, onEventSelect, selectedEvent }: GlobeSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const selectedIdRef = useRef<string | null>(selectedEvent?.id ?? null);

  const markerState = useMemo(() => new Map<string, THREE.Mesh>(), []);

  useEffect(() => {
    selectedIdRef.current = selectedEvent?.id ?? null;
    for (const [id, mesh] of markerState.entries()) {
      const event = events.find(e => e.id === id);
      if (!event) continue;
      const isSelected = selectedEvent?.id === id;
      const color = severityColor(event.severity);
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.color.setHex(color);
      material.emissive.setHex(color);
      material.emissiveIntensity = isSelected ? 3 : 1.6;
      mesh.scale.setScalar(isSelected ? 1.8 : 1);
    }
  }, [events, selectedEvent, markerState]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 1;
    const height = mount.clientHeight || 1;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#030810');
    scene.fog = new THREE.Fog('#030810', 7, 20);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.04;
    controls.minDistance = 3.2;
    controls.maxDistance = 10;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.4;

    const ambient = new THREE.AmbientLight(0x9bbcff, 0.22);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(5, 4, 6);
    scene.add(keyLight);

    const accentLight = new THREE.PointLight(0x00d4ff, 1.4, 20);
    accentLight.position.set(-5, -2, 5);
    scene.add(accentLight);

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const globeGeometry = new THREE.SphereGeometry(2, 64, 64);
    const globeMaterial = new THREE.MeshPhongMaterial({
      color: 0x0a1628,
      shininess: 20,
      specular: 0x3b82f6,
      emissive: 0x06101c,
      emissiveIntensity: 0.25,
    });
    const globe = new THREE.Mesh(globeGeometry, globeMaterial);
    globeGroup.add(globe);

    const wireframe = new THREE.Mesh(
      new THREE.SphereGeometry(2.01, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0x1e3a5f, wireframe: true, transparent: true, opacity: 0.25 })
    );
    globeGroup.add(wireframe);

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(2.08, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.04 })
    );
    globeGroup.add(atmosphere);

    const markerGroup = new THREE.Group();
    globeGroup.add(markerGroup);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const clickable: THREE.Object3D[] = [];

    for (const event of events) {
      const color = severityColor(event.severity);
      const geometry = new THREE.SphereGeometry(0.03, 16, 16);
      const material = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 1.6,
        metalness: 0.1,
        roughness: 0.2,
      });
      const marker = new THREE.Mesh(geometry, material);
      marker.position.copy(latLngToVector3(event.location.lat, event.location.lng, 2.06));
      marker.userData = { event };
      markerGroup.add(marker);
      clickable.push(marker);
      markerState.set(event.id, marker);
    }

    const onResize = () => {
      const nextWidth = mount.clientWidth || 1;
      const nextHeight = mount.clientHeight || 1;
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, nextHeight);
    };

    const onPointerDown = (ev: PointerEvent) => {
      pointer.x = (ev.clientX / renderer.domElement.clientWidth) * 2 - 1;
      pointer.y = -(ev.clientY / renderer.domElement.clientHeight) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(clickable, false)[0];
      if (hit?.object?.userData?.event) {
        const event = hit.object.userData.event as GlobalEvent;
        onEventSelect(event);
      }
    };

    window.addEventListener('resize', onResize);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    let frame = 0;
    const animate = () => {
      frame += 1;
      globe.rotation.y += 0.0012;
      wireframe.rotation.y += 0.0012;
      atmosphere.rotation.y += 0.0011;

      for (const [id, mesh] of markerState.entries()) {
        const event = events.find(e => e.id === id);
        if (!event) continue;
        const selected = selectedIdRef.current === id;
        const pulse = 1 + Math.sin(frame * 0.03 + mesh.position.x) * 0.15;
        const target = selected ? 1.7 : pulse;
        mesh.scale.lerp(new THREE.Vector3(target, target, target), 0.1);
      }

      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      controls.dispose();
      globeGeometry.dispose();
      globeMaterial.dispose();
      wireframe.geometry.dispose();
      (wireframe.material as THREE.Material).dispose();
      atmosphere.geometry.dispose();
      (atmosphere.material as THREE.Material).dispose();
      markerGroup.clear();
      renderer.dispose();
      mount.innerHTML = '';
    };
  }, [events, onEventSelect, markerState]);

  return <div ref={mountRef} className="w-full h-full" />;
}

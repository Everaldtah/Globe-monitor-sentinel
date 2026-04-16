'use client';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FlightTrack, GlobalEvent, VesselTrack, WeatherOverlay } from '@/lib/types';

interface GlobeSceneProps {
  events: GlobalEvent[];
  onEventSelect: (event: GlobalEvent) => void;
  selectedEvent: GlobalEvent | null;
  flights?: FlightTrack[];
  vessels?: VesselTrack[];
  weather?: WeatherOverlay[];
  mobileReduced?: boolean;
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

function createContinentMeshes() {
  const group = new THREE.Group();
  const continents = [
    { lat: 54, lng: -100, scale: [1.25, 0.65, 1.0], color: 0x9cc7ff },
    { lat: -10, lng: -60, scale: [0.9, 1.4, 0.7], color: 0x89b4ff },
    { lat: 50, lng: 15, scale: [1.0, 1.0, 0.8], color: 0x7fb6ff },
    { lat: 10, lng: 20, scale: [1.1, 1.2, 0.8], color: 0x7fb6ff },
    { lat: 45, lng: 95, scale: [1.4, 0.8, 0.9], color: 0x9cc7ff },
    { lat: -25, lng: 135, scale: [0.8, 0.5, 0.6], color: 0x7fb6ff },
    { lat: -80, lng: 0, scale: [1.7, 0.3, 1.7], color: 0x9cc7ff },
    { lat: 70, lng: -40, scale: [0.65, 0.4, 0.45], color: 0x9cc7ff },
  ];

  for (const continent of continents) {
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 24, 24),
      new THREE.MeshStandardMaterial({ color: continent.color, emissive: continent.color, emissiveIntensity: 0.08, roughness: 1, metalness: 0 })
    );
    body.position.copy(latLngToVector3(continent.lat, continent.lng, 2.02));
    body.scale.set(continent.scale[0], continent.scale[1], continent.scale[2]);
    const target = body.position.clone().normalize();
    body.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), target);
    group.add(body);
  }

  return group;
}

function createCloudLayer() {
  const cloudGroup = new THREE.Group();
  const cloudPoints = [
    { lat: 12, lng: -30 },
    { lat: 35, lng: 10 },
    { lat: -5, lng: 45 },
    { lat: 28, lng: 90 },
    { lat: -20, lng: -110 },
    { lat: 50, lng: 140 },
  ];

  for (const point of cloudPoints) {
    const cloud = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12 })
    );
    cloud.position.copy(latLngToVector3(point.lat, point.lng, 2.12));
    cloudGroup.add(cloud);
  }

  return cloudGroup;
}

export default function GlobeScene({ events, onEventSelect, selectedEvent, flights = [], vessels = [], weather = [], mobileReduced = false }: GlobeSceneProps) {
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

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#030810');
    scene.fog = new THREE.Fog('#030810', 6, 22);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, mobileReduced ? 7.1 : 6.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth || 1, mount.clientHeight || 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.04;
    controls.minDistance = mobileReduced ? 4.5 : 3.2;
    controls.maxDistance = 10;
    controls.autoRotate = true;
    controls.autoRotateSpeed = mobileReduced ? 0.24 : 0.42;

    const ambient = new THREE.AmbientLight(0x9bbcff, 0.42);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    keyLight.position.set(5, 4, 6);
    scene.add(keyLight);

    const accentLight = new THREE.PointLight(0x00d4ff, 1.5, 20);
    accentLight.position.set(-5, -2, 5);
    scene.add(accentLight);

    const glowLight = new THREE.PointLight(0x4c7dff, 0.8, 24);
    glowLight.position.set(0, 0, 10);
    scene.add(glowLight);

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const globeGeometry = new THREE.SphereGeometry(2, 80, 80);
    const globeMaterial = new THREE.MeshPhongMaterial({
      color: 0x091425,
      shininess: 28,
      specular: 0x4f8cff,
      emissive: 0x08111d,
      emissiveIntensity: 0.36,
      flatShading: false,
    });
    const globe = new THREE.Mesh(globeGeometry, globeMaterial);
    globeGroup.add(globe);

    const continents = createContinentMeshes();
    globeGroup.add(continents);

    const cloudLayer = createCloudLayer();
    globeGroup.add(cloudLayer);

    const wireframe = new THREE.Mesh(
      new THREE.SphereGeometry(2.03, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0x3b5f98, wireframe: true, transparent: true, opacity: 0.22 })
    );
    globeGroup.add(wireframe);

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(2.13, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.06 })
    );
    globeGroup.add(atmosphere);

    const markerGroup = new THREE.Group();
    globeGroup.add(markerGroup);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const clickable: THREE.Object3D[] = [];

    const addMarker = (lat: number, lng: number, color: number, userData: any, radius = 2.06, size = 0.035) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(size, 18, 18),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.6, metalness: 0.08, roughness: 0.25 })
      );
      mesh.position.copy(latLngToVector3(lat, lng, radius));
      mesh.userData = userData;
      markerGroup.add(mesh);
      clickable.push(mesh);
      if (userData.kind === 'event') markerState.set(userData.id, mesh);
      return mesh;
    };

    for (const event of events) {
      addMarker(event.location.lat, event.location.lng, severityColor(event.severity), { kind: 'event', id: event.id, event });
    }

    for (const flight of flights) {
      const c = flight.altitude && flight.altitude > 30000 ? 0xffd34d : 0x7fe7ff;
      addMarker(flight.lat, flight.lng, c, { kind: 'flight', flight }, 2.05, 0.02);
    }

    for (const vessel of vessels) {
      addMarker(vessel.lat, vessel.lng, 0x7ad6ff, { kind: 'vessel', vessel }, 2.04, 0.022);
    }

    const weatherMarkers = weather.length ? weather : [{ lat: 0, lng: 0, cloudiness: 50, temperatureC: 0, windSpeed: 0, precipitationMm: 0 }];
    for (const cloud of weatherMarkers) {
      const opacity = Math.min(0.28, 0.05 + (cloud.cloudiness / 100) * 0.22);
      const mat = new THREE.MeshBasicMaterial({ color: 0xdde9ff, transparent: true, opacity });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 14), mat);
      mesh.position.copy(latLngToVector3(cloud.lat, cloud.lng, 2.18));
      globeGroup.add(mesh);
    }

    const onResize = () => {
      const nextWidth = mount.clientWidth || 1;
      const nextHeight = mount.clientHeight || 1;
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, nextHeight);
    };

    const onPointerDown = (ev: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -(((ev.clientY - rect.top) / rect.height) * 2 - 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(clickable, false)[0];
      const userData = hit?.object?.userData;
      if (userData?.kind === 'event') {
        onEventSelect(userData.event as GlobalEvent);
      }
    };

    window.addEventListener('resize', onResize);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    let frame = 0;
    const animate = () => {
      frame += 1;
      globe.rotation.y += 0.0011;
      continents.rotation.y += 0.00115;
      cloudLayer.rotation.y += 0.0016;
      wireframe.rotation.y += 0.00115;
      atmosphere.rotation.y += 0.0011;

      for (const [id, mesh] of markerState.entries()) {
        const event = events.find(e => e.id === id);
        if (!event) continue;
        const selected = selectedIdRef.current === id;
        const pulse = 1 + Math.sin(frame * 0.03 + mesh.position.x) * 0.12;
        const target = selected ? 1.8 : pulse;
        mesh.scale.lerp(new THREE.Vector3(target, target, target), 0.12);
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
  }, [events, flights, vessels, weather, onEventSelect, mobileReduced, markerState]);

  return <div ref={mountRef} className="w-full h-full" />;
}

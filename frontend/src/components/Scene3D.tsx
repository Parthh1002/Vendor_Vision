import React, { useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, OrbitControls, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { useTheme } from "../contexts/ThemeContext";

const GlobeSystem: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const earthRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);
  const satellitesRef = useRef<THREE.Group>(null);

  // Load textures from standard Three.js examples repository
  const [colorMap, emissiveMap, cloudsMap] = useTexture([
    "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg",
    "https://threejs.org/examples/textures/planets/earth_lights_2048.png",
    "https://threejs.org/examples/textures/planets/earth_clouds_1024.png",
  ]);

  useFrame((_state, delta) => {
    // 1. Earth rotation
    if (earthRef.current) {
      earthRef.current.rotation.y += delta * 0.08;
    }
    // 2. Clouds rotation (slightly faster)
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.12;
    }
    // 4. Rings rotation (each on different axes, speed 0.1 - 0.2)
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x += delta * 0.11;
      ring1Ref.current.rotation.y += delta * 0.05;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.y += delta * 0.14;
      ring2Ref.current.rotation.z += delta * 0.06;
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.z += delta * 0.16;
      ring3Ref.current.rotation.x += delta * 0.07;
    }
    // 5. Orbiting satellites group rotation
    if (satellitesRef.current) {
      satellitesRef.current.rotation.y += delta * 0.3;
    }
  });

  // Calculate 6 satellite positions spaced equally at radius 2.4
  const satellites = Array.from({ length: 6 }).map((_, i) => {
    const angle = (i * 2 * Math.PI) / 6;
    const x = 2.4 * Math.cos(angle);
    const z = 2.4 * Math.sin(angle);
    return new THREE.Vector3(x, 0, z);
  });

  return (
    <group>
      {/* 1. The Earth centerpiece: optimized sphere geometry radius 1.6, segments 48x48 */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[1.6, 48, 48]} />
        <meshStandardMaterial
          map={colorMap}
          emissiveMap={emissiveMap}
          emissive={new THREE.Color("#ffb347")}
          emissiveIntensity={isDark ? 1.25 : 0.4} // softer emissive in light theme to look natural
          roughness={0.85}
          metalness={0.1}
        />
      </mesh>

      {/* 2. Cloud layer: scale 1.015, transparent: true, opacity: 0.35, depthWrite: false */}
      <mesh ref={cloudsRef} scale={[1.015, 1.015, 1.015]}>
        <sphereGeometry args={[1.6, 48, 48]} />
        <meshStandardMaterial
          map={cloudsMap}
          transparent={true}
          opacity={0.35}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 3. Atmospheric glow: scale 1.12, BasicMaterial, BackSide */}
      <mesh scale={[1.12, 1.12, 1.12]}>
        <sphereGeometry args={[1.6, 48, 48]} />
        <meshBasicMaterial
          color={isDark ? "#4a8dff" : "#2563eb"}
          transparent={true}
          opacity={isDark ? 0.08 : 0.15} // stronger blue atmospheric halo in light theme for contrast
          side={THREE.BackSide}
        />
      </mesh>

      {/* 4. Orbiting rings: torusGeometry [2.2, 0.008, 8, 64] for extreme efficiency */}
      {/* Ring 1: Blue #60a5fa, tilted at [0.3, 0.2, 0] */}
      <mesh ref={ring1Ref} rotation={[0.3, 0.2, 0]}>
        <torusGeometry args={[2.2, 0.008, 8, 64]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={isDark ? 0.5 : 0.6} />
      </mesh>

      {/* Ring 2: Pink #f0abfc, tilted at [1.1, 0.5, 0.4] */}
      <mesh ref={ring2Ref} rotation={[1.1, 0.5, 0.4]}>
        <torusGeometry args={[2.2, 0.008, 8, 64]} />
        <meshBasicMaterial color="#f0abfc" transparent opacity={isDark ? 0.5 : 0.6} />
      </mesh>

      {/* Ring 3: Indigo #a5b4fc, tilted at [0.6, 1.2, 0.8] */}
      <mesh ref={ring3Ref} rotation={[0.6, 1.2, 0.8]}>
        <torusGeometry args={[2.2, 0.008, 8, 64]} />
        <meshBasicMaterial color="#a5b4fc" transparent opacity={isDark ? 0.5 : 0.6} />
      </mesh>

      {/* 5. Orbiting satellites: 6 spheres of radius 0.04, bright blue, basic material */}
      <group ref={satellitesRef}>
        {satellites.map((pos, index) => (
          <mesh key={index} position={pos}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshBasicMaterial color="#60a5fa" />
          </mesh>
        ))}
      </group>
    </group>
  );
};

// 6. Background stars orbiting component: slow Y/X rotation for deep space drift
export const BackgroundStars: React.FC<{ isDark?: boolean }> = ({ isDark = true }) => {
  const starsGroupRef = useRef<THREE.Group>(null);

  useFrame((_state, delta) => {
    if (starsGroupRef.current) {
      starsGroupRef.current.rotation.y += delta * 0.012;
      starsGroupRef.current.rotation.x += delta * 0.003;
    }
  });

  return (
    <group ref={starsGroupRef}>
      <Stars
        radius={100}
        depth={60}
        count={isDark ? 2000 : 1000} // Reduced count from 8000/5000 for better performance
        factor={isDark ? 5 : 4}
        saturation={isDark ? 0 : 0.5}
        fade
        speed={isDark ? 1.5 : 1.0}
      />
    </group>
  );
};

// Full screen background Canvas containing the orbiting stars
export const BackgroundStarsCanvas: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Canvas
      dpr={1} // Lock device pixel ratio to 1 to reduce fragment shader calculations
      camera={{ position: [0, 0, 50], fov: 60 }}
      style={{ pointerEvents: "none", width: "100%", height: "100%" }}
    >
      <Suspense fallback={null}>
        <BackgroundStars isDark={isDark} />
      </Suspense>
    </Canvas>
  );
};

const Scene3D: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="w-full h-full">
      <Canvas
        dpr={1} // Lock device pixel ratio to 1 for high performance inside the widget container
        camera={{ position: [0, 0, 6.5], fov: 45 }}
        style={{ background: "transparent", width: "100%", height: "100%" }}
      >
        {/* 7. Lighting - dynamically adjusted for light vs dark theme */}
        <ambientLight intensity={isDark ? 0.25 : 0.75} />
        <directionalLight
          position={[5, 3, 5]}
          intensity={isDark ? 1.6 : 2.2}
          color="#fff5e1"
        />
        <pointLight
          position={[-5, -2, -3]}
          intensity={isDark ? 0.6 : 0.8}
          color="#4a8dff"
        />

        <Suspense fallback={null}>
          <GlobeSystem isDark={isDark} />
        </Suspense>

        {/* 8. Camera + Controls */}
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.6}
          rotateSpeed={0.7}
        />
      </Canvas>
    </div>
  );
};

export default Scene3D;

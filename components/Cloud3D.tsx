
import React, { useRef, useMemo } from 'react';
import { useFrame, extend, useThree } from '@react-three/fiber';
import { Group, Vector3, Mesh, MeshBasicMaterial, BoxGeometry, SphereGeometry, InstancedMesh, Object3D, AdditiveBlending, Color, Vector2 } from 'three';
import { OrbitControls, Stars as DreiStars, Sparkles, PerspectiveCamera, shaderMaterial } from '@react-three/drei';

// --- Types for External Control ---
export type CloudLayerConfig = {
  z: number;
  seed: number;
  speed: number;
  density: number;
  coverage: number;
  sharpness: number;
  detail: number;
  color: string;
};

export type CloudSystemConfig = {
  fogColor: string;
  fogDensity: number;
  ambientIntensity: number;
  lightIntensity: number;
  layers: CloudLayerConfig[];
};

// --- 1. Advanced Cloud Shader with Rim Lighting & Turbulence ---

const CloudHyperMaterial = shaderMaterial(
  {
    u_time: 0,
    u_seed: 0,            
    u_coverage: 0.5,      
    u_density: 1.0,       
    u_sharpness: 0.5,     
    u_color: new Color('#ffffff'),
    u_sky: new Color('#3399ff'),
    u_sunDir: new Vector3(1.0, 1.0, 1.0).normalize(),
    u_scale: new Vector2(1, 1),
    u_detail: 1.0,   
    u_scrollSpeed: 0.05,     
    u_turbulence: 0.2, // New: How much the cloud shape boils/morphs
  },
  // Vertex Shader
  `
    varying vec2 vUv;
    varying vec3 vViewPosition;
    varying vec3 vNormal;

    void main() {
      vUv = uv;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      vNormal = normalMatrix * normal;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  // Fragment Shader
  `
    precision highp float;
    varying vec2 vUv;
    
    uniform float u_time;
    uniform float u_seed;
    uniform float u_scrollSpeed;
    uniform float u_turbulence; 
    uniform float u_coverage;
    uniform float u_density;
    uniform float u_sharpness;
    uniform float u_detail;
    uniform vec3 u_color;
    uniform vec2 u_scale;

    // Simplex Noise 2D
    vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
    float snoise(vec2 v){
      const vec4 C = vec4(0.211324865405187, 0.366025403784439,
               -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy) );
      vec2 x0 = v -   i + dot(i, C.xx);
      vec2 i1;
      i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod(i, 289.0);
      vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
      + i.x + vec3(0.0, i1.x, 1.0 ));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
      m = m*m ;
      m = m*m ;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    float fbm(vec2 st) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 1.0 + (u_seed * 0.1); 
        
        for (int i = 0; i < 5; i++) {
            value += amplitude * snoise(st * frequency + u_seed);
            st *= 2.0;
            amplitude *= 0.5;
            st += value * 0.2; 
        }
        return value;
    }

    void main() {
        vec2 st = vUv * u_scale;
        float t = u_time * u_scrollSpeed;
        
        // Parallax + Turbulence
        // We add a secondary time component to the noise lookup to make clouds "boil"
        vec2 drift = vec2(t, t * 0.2);
        vec2 turb = vec2(snoise(st + u_time * u_turbulence * 0.1), snoise(st - u_time * u_turbulence * 0.1)) * 0.1;

        // 1. Base Cloud Shape
        float n1 = fbm(st * 1.2 + drift + turb);
        n1 = (n1 + 1.0) * 0.5; 
        
        // 2. Erosion
        float n2 = fbm(st * 3.5 * u_detail - drift * 1.5);
        n2 = (n2 + 1.0) * 0.5;

        float noiseVal = n1 - (n2 * 0.35); 

        // 3. Alpha Logic
        float threshold = 1.0 - u_coverage; 
        float edgeWidth = mix(0.4, 0.05, u_sharpness);
        float alpha = smoothstep(threshold, threshold + edgeWidth, noiseVal);
        
        // 4. Lighting / Rim Light (Fake Volumetrics)
        // Create a second noise layer slightly offset towards the "sun" (top left usually)
        float offsetVal = fbm((st * 1.2 + drift + turb) + vec2(0.04, 0.04));
        offsetVal = (offsetVal + 1.0) * 0.5;
        
        // If the offset value is higher than the current value, we are in a "shadow"
        // If it's lower, we are on an edge facing the light.
        float lightMask = smoothstep(threshold, threshold + edgeWidth, offsetVal);
        
        float shadow = 1.0 - lightMask; // Areas that are "behind" the offset
        float highlight = max(0.0, lightMask - alpha) * 4.0; // The rim

        // Additional Rim based on density gradient
        float rim = smoothstep(threshold, threshold + 0.1, noiseVal) * (1.0 - smoothstep(threshold + 0.1, threshold + 0.3, noiseVal));
        highlight += rim * 2.0;

        // Final Color Mixing
        vec3 finalCloud = u_color;
        
        // Apply self-shadowing
        finalCloud *= mix(1.0, 0.7, shadow * alpha); 
        
        // Apply highlights
        finalCloud = mix(finalCloud, vec3(1.0), highlight * 0.6);

        // Soft Edges for Plane
        float borderDist = min(min(vUv.x, 1.0-vUv.x), min(vUv.y, 1.0-vUv.y));
        float borderMask = smoothstep(0.0, 0.2, borderDist);
        
        alpha *= borderMask * u_density;

        gl_FragColor = vec4(finalCloud, alpha);
    }
  `
);

extend({ CloudHyperMaterial });

// --- 2. Geometries ---
const rainGeometry = new BoxGeometry(0.02, 0.5, 0.02);
const snowGeometry = new SphereGeometry(0.04, 5, 5);
const rainMaterial = new MeshBasicMaterial({ color: "#aaddff", transparent: true, opacity: 0.4 });
const snowMaterial = new MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.8 });

// --- 3. Sub-Components ---

const Sun = ({ onInteract }: { onInteract: () => void }) => {
    const groupRef = useRef<Group>(null);
    useFrame((state) => {
        if (!state || !groupRef.current) return;
        const t = state.clock.getElapsedTime();
        groupRef.current.position.y = 2.5 + Math.sin(t * 0.1) * 0.1; // Slightly lower Y
    });
    return (
        <group ref={groupRef} position={[2.5, 2.5, -4]} onClick={(e) => { e.stopPropagation(); onInteract(); }}> {/* Adjusted position to be less aggressive */}
            <mesh>
                <sphereGeometry args={[0.8, 32, 32]} />
                <meshBasicMaterial color="#ffcc00" fog={false} />
            </mesh>
            <mesh position={[0, 0, -0.2]} scale={[4, 4, 4]}>
                <circleGeometry args={[1, 32]} />
                <meshBasicMaterial color="#ffaa00" transparent opacity={0.2} blending={AdditiveBlending} fog={false} />
            </mesh>
            <Sparkles count={15} scale={6} size={12} speed={0.1} opacity={0.6} color="#ffdd88" />
        </group>
    );
};

const Moon = ({ phase = 0.5 }: { phase?: number }) => {
    const meshRef = useRef<Group>(null);
    useFrame((state) => {
         if (meshRef.current) meshRef.current.position.y = 2.5 + Math.sin(state.clock.getElapsedTime() * 0.1) * 0.1;
    });
    return (
        <group ref={meshRef} position={[2.5, 2.5, -4]}>
            <mesh>
                <sphereGeometry args={[0.6, 32, 32]} />
                <meshBasicMaterial color="#f0f0f0" fog={false} />
            </mesh>
            <mesh scale={[2.5, 2.5, 2.5]} position={[0,0,-0.1]}>
                <circleGeometry args={[0.5, 32]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.15} blending={AdditiveBlending} fog={false} />
            </mesh>
        </group>
    );
};

// A single layer of cloud
const CloudLayer = (props: any) => {
    const materialRef = useRef<any>(null);
    const { viewport } = useThree();
    
    // Safeguard against NaN / undefined if viewport or props are not ready
    const z = Number.isFinite(props.z) ? props.z : -10;
    const scaleMult = 1 + Math.abs(z) * 0.4;
    
    // Ensure width/height are finite positive numbers to prevent BufferGeometry NaNs
    const vpW = (viewport && Number.isFinite(viewport.width)) ? viewport.width : 10;
    const vpH = (viewport && Number.isFinite(viewport.height)) ? viewport.height : 10;
    
    const width = vpW * 3 * scaleMult;
    const height = vpH * 3 * scaleMult;
    
    const uvScale = useMemo(() => new Vector2(2 + Math.random(), 1.0), []);

    useFrame((state) => {
        if(materialRef.current) {
            materialRef.current.u_time = state.clock.getElapsedTime();
        }
    });

    return (
        <mesh position={[0, 0, z]} rotation={[0, 0, props.rotation || 0]}>
            <planeGeometry args={[width, height]} />
            {/* @ts-ignore */}
            <cloudHyperMaterial 
                ref={materialRef}
                transparent
                depthWrite={false}
                u_seed={props.seed}
                u_coverage={props.coverage}
                u_density={props.density}
                u_sharpness={props.sharpness}
                u_detail={props.detail}
                u_color={new Color(props.color)}
                u_scale={uvScale}
                u_scrollSpeed={props.speed}
                u_turbulence={0.15} // Constant subtle turbulence
            />
        </mesh>
    );
};

const Precipitation = ({ isSnow }: { isSnow: boolean }) => {
    const count = isSnow ? 120 : 100;
    const meshRef = useRef<InstancedMesh>(null);
    const dummy = useMemo(() => new Object3D(), []);
    
    const particles = useMemo(() => new Array(count).fill(0).map(() => ({
        pos: new Vector3((Math.random()-0.5)*12, Math.random()*10 - 5, (Math.random()-0.5)*6),
        vel: isSnow ? new Vector3(0, -0.02 - Math.random()*0.02, 0) : new Vector3(0, -0.2 - Math.random()*0.1, 0),
        speed: Math.random(),
        sway: Math.random() * 100
    })), [isSnow, count]);

    useFrame((state) => {
        if (!state || !meshRef.current) return;
        const t = state.clock.getElapsedTime();
        particles.forEach((p, i) => {
            p.pos.add(p.vel);
            if (p.pos.y < -5) { 
                p.pos.y = 5; 
                p.pos.x = (Math.random()-0.5)*12; 
            }
            
            if (isSnow) {
                p.pos.x += Math.sin(t + p.sway) * 0.003;
                dummy.rotation.z = t * p.speed;
            }
            
            dummy.position.copy(p.pos);
            if(!isSnow) dummy.rotation.set(0,0,0.1); 
            
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return <instancedMesh ref={meshRef} args={[isSnow ? snowGeometry : rainGeometry, isSnow ? snowMaterial : rainMaterial, count]} />;
}

// --- Main Export ---

interface CloudSceneProps {
  weatherCode: string;
  isDay: boolean;
  moonPhase?: number;
  config?: CloudSystemConfig;
  showCelestial?: boolean;
}

export const Cloud3D: React.FC<CloudSceneProps> = ({ weatherCode = '', isDay, moonPhase = 0.5, config, showCelestial = true }) => {
  
  // Use provided config or generate one based on weatherCode
  const finalConfig = useMemo(() => {
      if (config) return config;

      const generated: CloudSystemConfig = {
          ambientIntensity: isDay ? 0.8 : 0.3,
          lightIntensity: isDay ? 1.2 : 0.4,
          fogColor: isDay ? '#bfdbfe' : '#0f172a',
          fogDensity: 0.02,
          layers: [] as CloudLayerConfig[]
      };

      // Helper to create layers
      const createLayer = (z: number, seed: number, speed: number, density: number, coverage: number, sharpness: number, color: string): CloudLayerConfig => ({
          z, seed, speed, density, coverage, sharpness, detail: 1.0, color
      });

      const CLOUD_WHITE = isDay ? '#ffffff' : '#64748b';
      const CLOUD_DARK = isDay ? '#e2e8f0' : '#334155';

      // Safeguard for empty or undefined weatherCode
      const safeCode = weatherCode || 'clear';

      if (safeCode.includes('clear')) {
          generated.fogDensity = 0.01; 
          generated.layers = [
              createLayer(-10, 123, 0.01, 0.4, 0.15, 0.2, CLOUD_WHITE),
          ];
      } 
      else if (safeCode.includes('partly')) {
          generated.fogDensity = 0.02; 
          generated.layers = [
              createLayer(-12, 1, 0.02, 0.8, 0.4, 0.6, CLOUD_DARK),
              createLayer(-8, 55, 0.04, 0.7, 0.35, 0.8, CLOUD_WHITE),
              createLayer(-4, 99, 0.08, 0.3, 0.2, 0.1, CLOUD_WHITE),
          ];
      }
      else if (safeCode.includes('overcast')) {
          generated.fogDensity = 0.08;
          generated.fogColor = isDay ? '#94a3b8' : '#1e293b';
          generated.ambientIntensity = 0.5;
          generated.lightIntensity = 0.5;
          generated.layers = [
              createLayer(-10, 10, 0.03, 1.0, 0.9, 0.1, CLOUD_DARK),
              createLayer(-6, 20, 0.05, 0.8, 0.8, 0.2, CLOUD_WHITE),
          ];
      }
      else if (safeCode.includes('rain') || safeCode.includes('thunder')) {
          generated.fogDensity = 0.12;
          generated.fogColor = isDay ? '#475569' : '#020617';
          generated.ambientIntensity = 0.4;
          generated.lightIntensity = 0.2;
          const STORM_COLOR = '#475569';
          generated.layers = [
              createLayer(-10, 33, 0.08, 1.0, 0.85, 0.4, STORM_COLOR),
              createLayer(-7, 44, 0.12, 0.9, 0.7, 0.5, '#64748b'),
              createLayer(-4, 55, 0.15, 0.4, 0.4, 0.1, '#94a3b8'),
          ];
      }
      else if (safeCode.includes('snow')) {
          generated.fogDensity = 0.15; 
          generated.fogColor = isDay ? '#e2e8f0' : '#1e293b';
          generated.layers = [
              createLayer(-10, 66, 0.02, 0.9, 0.95, 0.1, '#f1f5f9'),
              createLayer(-5, 77, 0.04, 0.6, 0.6, 0.1, '#ffffff'),
          ];
      }
      else if (safeCode.includes('fog')) {
          generated.fogDensity = 0.25;
          generated.fogColor = isDay ? '#cbd5e1' : '#334155';
          generated.layers = [
               createLayer(-8, 88, 0.02, 0.5, 1.0, 0.0, CLOUD_DARK),
               createLayer(-4, 99, 0.05, 0.3, 0.8, 0.0, CLOUD_WHITE),
          ];
      }

      return generated;
  }, [weatherCode, isDay, config]);

  const safeCode = weatherCode || '';
  const isPrecip = safeCode.includes('rain') || safeCode.includes('drizzle') || safeCode.includes('snow') || safeCode.includes('blizzard') || safeCode.includes('thunder');
  const isSnow = safeCode.includes('snow') || safeCode.includes('blizzard');

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={50} />
      
      {/* Realistic Fog blending */}
      <fogExp2 attach="fog" color={finalConfig.fogColor} density={finalConfig.fogDensity} />

      {/* Cloud Layers (Parallax System) */}
      {finalConfig.layers.map((layer, idx) => (
          <CloudLayer key={idx} {...layer} />
      ))}

      {/* Lights */}
      <ambientLight intensity={finalConfig.ambientIntensity} />
      <directionalLight position={[5, 5, 5]} intensity={finalConfig.lightIntensity} castShadow />

      {/* Celestial Objects - Hide in heavy overcast/fog unless forced by studio config */}
      {/* FIX: Hide when showCelestial is false (Explorer Mode) */}
      {(showCelestial && isDay && !isPrecip && !safeCode.includes('fog') && !safeCode.includes('overcast')) && <Sun onInteract={()=>{}} />}
      {(showCelestial && !isDay && !isPrecip && !safeCode.includes('fog') && !safeCode.includes('overcast')) && <Moon phase={moonPhase} />}
      
      {(!isDay && !safeCode.includes('overcast') && !safeCode.includes('fog')) && <Stars />}

      {/* Precip */}
      {isPrecip && <Precipitation isSnow={isSnow} />}

      <OrbitControls enableZoom={false} enablePan={false} enableRotate={true} rotateSpeed={0.2} minPolarAngle={1.3} maxPolarAngle={1.7} />
    </>
  );
};

const Stars = () => (
    <group position={[0,0,-15]}>
        <DreiStars radius={60} depth={20} count={1500} factor={5} saturation={0} fade speed={0.5} />
    </group>
);

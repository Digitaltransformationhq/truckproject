import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));

export function TruckSuccess3D() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 80);
    camera.position.set(4.5, 3.15, 8.7);
    camera.lookAt(0, 1.25, 0.15);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      mount.classList.add('truck-3d-unavailable');
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xf8fbff, 0x6a7480, 2.4));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(-4, 7, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -5;
    keyLight.shadow.camera.right = 5;
    keyLight.shadow.camera.top = 5;
    keyLight.shadow.camera.bottom = -5;
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x76a8ff, 1.35);
    rimLight.position.set(5, 3, -5);
    scene.add(rimLight);

    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 24),
      new THREE.MeshStandardMaterial({ color: 0xe8edf1, roughness: 0.96, metalness: 0.02 }),
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, -0.03, 0);
    road.receiveShadow = true;
    scene.add(road);

    const laneMarkers: THREE.Mesh[] = [];
    const markerMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
    for (let index = 0; index < 8; index += 1) {
      const marker = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.015, 0.75), markerMaterial);
      marker.position.set(-2.1, 0.006, -6 + index * 2.3);
      marker.receiveShadow = true;
      scene.add(marker);
      laneMarkers.push(marker);
    }

    const truck = new THREE.Group();
    truck.position.set(0, 0.73, -3.6);
    scene.add(truck);

    const white = new THREE.MeshPhysicalMaterial({ color: 0xf3f5f4, roughness: 0.42, metalness: 0.18, clearcoat: 0.28, clearcoatRoughness: 0.35 });
    const silver = new THREE.MeshStandardMaterial({ color: 0xaab3bb, roughness: 0.35, metalness: 0.75 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x19222b, roughness: 0.58, metalness: 0.55 });
    const rubber = new THREE.MeshStandardMaterial({ color: 0x11171d, roughness: 0.92, metalness: 0.04 });
    const glass = new THREE.MeshPhysicalMaterial({ color: 0x668ca4, roughness: 0.16, metalness: 0.12, transmission: 0.18, transparent: true, opacity: 0.86 });
    const green = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.42, metalness: 0.12 });
    const red = new THREE.MeshStandardMaterial({ color: 0xe63e32, roughness: 0.3, emissive: 0x8c0800, emissiveIntensity: 0.5 });
    const amber = new THREE.MeshStandardMaterial({ color: 0xffa51f, roughness: 0.34, emissive: 0x8a3d00, emissiveIntensity: 0.35 });

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.18, 4.9), dark);
    chassis.position.set(0, 0.43, -0.25);
    chassis.castShadow = true;
    truck.add(chassis);

    const cargo = new THREE.Mesh(new THREE.BoxGeometry(2.46, 2.48, 3.65), white);
    cargo.position.set(0, 1.72, -0.18);
    cargo.castShadow = true;
    cargo.receiveShadow = true;
    truck.add(cargo);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.12, 3.75), silver);
    roof.position.set(0, 3.0, -0.18);
    roof.castShadow = true;
    truck.add(roof);

    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.22, 1.75, 1.22), white);
    cab.position.set(0, 1.32, -2.58);
    cab.castShadow = true;
    truck.add(cab);
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.75, 0.035), glass);
    windshield.position.set(0, 1.68, -3.205);
    windshield.rotation.x = -0.08;
    truck.add(windshield);

    const rearFrame = new THREE.Mesh(new THREE.BoxGeometry(2.54, 2.56, 0.11), silver);
    rearFrame.position.set(0, 1.72, 1.67);
    rearFrame.castShadow = true;
    truck.add(rearFrame);

    const leftDoorPivot = new THREE.Group();
    const rightDoorPivot = new THREE.Group();
    leftDoorPivot.position.set(-1.18, 1.76, 1.74);
    rightDoorPivot.position.set(1.18, 1.76, 1.74);
    truck.add(leftDoorPivot, rightDoorPivot);

    const makeDoor = (side: -1 | 1) => {
      const door = new THREE.Group();
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.13, 2.31, 0.08), white);
      panel.position.x = side * -0.565;
      panel.castShadow = true;
      door.add(panel);
      for (let rib = 0; rib < 3; rib += 1) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.035, 2.08, 0.045), silver);
        rail.position.set(side * -(0.25 + rib * 0.29), 0, 0.065);
        door.add(rail);
      }
      const latch = new THREE.Mesh(new THREE.BoxGeometry(0.055, 1.92, 0.07), dark);
      latch.position.set(side * -1.02, 0, 0.095);
      door.add(latch);
      return door;
    };
    leftDoorPivot.add(makeDoor(-1));
    rightDoorPivot.add(makeDoor(1));

    const tick = new THREE.Group();
    const tickA = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.08), green);
    tickA.scale.x = 4.7;
    tickA.rotation.z = -0.63;
    tickA.position.set(-0.32, -0.06, 0.13);
    const tickB = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.08), green);
    tickB.scale.x = 8.2;
    tickB.rotation.z = 0.48;
    tickB.position.set(0.2, 0.12, 0.13);
    tick.add(tickA, tickB);
    tick.position.set(0, 1.75, 1.73);
    truck.add(tick);

    const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.2, 0.3), dark);
    bumper.position.set(0, 0.38, 1.93);
    bumper.castShadow = true;
    truck.add(bumper);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.2, 0.035), new THREE.MeshStandardMaterial({ color: 0xf5f5ef, roughness: 0.7 }));
    plate.position.set(0, 0.4, 2.095);
    truck.add(plate);

    const brakeLights: THREE.Mesh[] = [];
    for (const side of [-1, 1]) {
      const light = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.08), red);
      light.position.set(side * 0.96, 0.64, 1.84);
      truck.add(light);
      brakeLights.push(light);
      const indicator = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.07), amber);
      indicator.position.set(side * 1.22, 0.43, 2.1);
      truck.add(indicator);
      const mirrorArm = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.52, 8), dark);
      mirrorArm.position.set(side * 1.4, 2.03, -2.62);
      mirrorArm.rotation.z = Math.PI / 2;
      truck.add(mirrorArm);
      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.45, 0.13), dark);
      mirror.position.set(side * 1.66, 2.03, -2.62);
      mirror.castShadow = true;
      truck.add(mirror);
    }

    const wheels: THREE.Mesh[] = [];
    const axlePositions = [-2.18, 0.38, 1.18];
    for (const axleZ of axlePositions) {
      const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.35, 10), dark);
      axle.rotation.z = Math.PI / 2;
      axle.position.set(0, 0.24, axleZ);
      truck.add(axle);
      for (const side of [-1, 1]) {
        const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.25, 24, 1), rubber);
        tire.rotation.z = Math.PI / 2;
        tire.position.set(side * 1.22, 0.24, axleZ);
        tire.castShadow = true;
        truck.add(tire);
        wheels.push(tire);
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.27, 16), silver);
        hub.rotation.z = Math.PI / 2;
        hub.position.copy(tire.position);
        truck.add(hub);
      }
    }

    const mudguardGeometry = new THREE.BoxGeometry(0.12, 0.48, 0.62);
    for (const side of [-1, 1]) {
      const mudguard = new THREE.Mesh(mudguardGeometry, dark);
      mudguard.position.set(side * 1.25, 0.47, 1.23);
      mudguard.castShadow = true;
      truck.add(mudguard);
    }

    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 128;
    const shadowContext = shadowCanvas.getContext('2d');
    if (shadowContext) {
      const gradient = shadowContext.createRadialGradient(128, 64, 8, 128, 64, 112);
      gradient.addColorStop(0, 'rgba(18,27,34,.48)');
      gradient.addColorStop(0.55, 'rgba(18,27,34,.2)');
      gradient.addColorStop(1, 'rgba(18,27,34,0)');
      shadowContext.fillStyle = gradient;
      shadowContext.fillRect(0, 0, 256, 128);
    }
    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(4.5, 2.8),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false }),
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.set(0, 0.015, 0.2);
    scene.add(contactShadow);

    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    const clock = new THREE.Clock();
    let frame = 0;
    let positionZ = reducedMotion ? 0 : -3.6;
    let velocityZ = 0;
    let suspension = 0;
    let suspensionVelocity = 0;
    let wheelAngle = 0;
    let travelled = 0;
    let doorAngle = reducedMotion ? 0 : 0.92;
    let doorVelocity = 0;

    const animate = () => {
      const delta = Math.min(clock.getDelta(), 1 / 30);
      const elapsed = clock.elapsedTime;
      if (!reducedMotion) {
        const driveForce = (0 - positionZ) * 5.2 - velocityZ * 4.3;
        velocityZ += driveForce * delta;
        positionZ += velocityZ * delta;
        travelled += Math.abs(velocityZ) * delta;
        wheelAngle += velocityZ * delta / 0.36;

        const roadInput = Math.sin(travelled * 7.2) * Math.min(Math.abs(velocityZ) * 0.009, 0.024);
        const suspensionForce = (roadInput - suspension) * 72 - suspensionVelocity * 15;
        suspensionVelocity += suspensionForce * delta;
        suspension += suspensionVelocity * delta;

        const doorForce = (0 - doorAngle) * 18 - doorVelocity * 7.5;
        doorVelocity += doorForce * delta;
        doorAngle += doorVelocity * delta;

        const speedFactor = clamp(Math.abs(velocityZ) / 4, 0, 1);
        truck.position.set(Math.sin(elapsed * 1.2) * 0.018 * speedFactor, 0.73 + suspension, positionZ);
        truck.rotation.z = clamp(-suspensionVelocity * 0.018 + Math.sin(elapsed * 2.1) * 0.006 * speedFactor, -0.025, 0.025);
        truck.rotation.x = clamp(-driveForce * 0.0045, -0.035, 0.035);
        truck.rotation.y = Math.sin(elapsed * 1.55) * 0.012 * speedFactor;
        wheels.forEach((wheel) => { wheel.rotation.x = wheelAngle; });
        leftDoorPivot.rotation.y = doorAngle;
        rightDoorPivot.rotation.y = -doorAngle;
        laneMarkers.forEach((marker, index) => { marker.position.z = -6 + ((index * 2.3 + travelled * 1.35) % 18.4); });
        const braking = clamp(1 - Math.abs(velocityZ) * 1.25, 0, 1);
        red.emissiveIntensity = 0.45 + braking * 2.1;
        brakeLights.forEach((light) => { light.scale.setScalar(1 + braking * 0.035); });
        contactShadow.position.z = positionZ + 0.25;
        contactShadow.scale.setScalar(1 - clamp(Math.abs(suspension) * 1.8, 0, 0.08));
      }
      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => {
            if (material.map) material.map.dispose();
            material.dispose();
          });
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={mountRef} className="truck-success-3d" role="img" aria-label="A three-dimensional cargo truck settling on its suspension after confirming the trip"><span className="truck-3d-fallback" aria-hidden="true">✓</span></div>;
}

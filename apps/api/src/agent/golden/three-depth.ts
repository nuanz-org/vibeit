/**
 * Golden: three-depth (AM6 + B2 real three harness).
 * Rotating depth cube with lights + MeshStandardMaterial — few-shot for three target.
 */
import { createThreeTool, THREE } from "@repo/contracts/skeletons/three";

function colorFrom(hex: string, fallback: string): THREE.Color {
  try {
    return new THREE.Color(hex || fallback);
  } catch {
    return new THREE.Color(fallback);
  }
}

let mesh: THREE.Mesh | null = null;

export const createTool = () =>
  createThreeTool(
    {
      getParamSchema: () => [
        { name: "bg", kind: "color", label: "Background", default: "#0a0a12" },
        { name: "accent", kind: "color", label: "Accent", default: "#7c5cff" },
        { name: "ink", kind: "color", label: "Rim", default: "#f0eaff" },
        {
          name: "speed",
          kind: "number",
          label: "Speed",
          default: 1,
          min: 0,
          max: 2.5,
          step: 0.05,
        },
        {
          name: "intensity",
          kind: "number",
          label: "Intensity",
          default: 0.7,
          min: 0,
          max: 1.5,
          step: 0.05,
        },
      ],
      getDefaultParams: () => ({
        bg: "#0a0a12",
        accent: "#7c5cff",
        ink: "#f0eaff",
        speed: 1,
        intensity: 0.7,
      }),
      getAssetSlots: () => [],
      setup(c) {
        const T = c.THREE;
        c.scene.add(new T.AmbientLight(0xffffff, 0.4));
        const key = new T.DirectionalLight(0xffffff, 1.2);
        key.position.set(2.8, 3.2, 2.4);
        c.scene.add(key);
        const rim = new T.DirectionalLight(
          colorFrom(String(c.params.ink ?? "#f0eaff"), "#f0eaff"),
          0.55,
        );
        rim.position.set(-2.2, 1.2, -1.5);
        rim.name = "rim-light";
        c.scene.add(rim);

        mesh = new T.Mesh(
          new T.BoxGeometry(1.05, 1.05, 1.05),
          new T.MeshStandardMaterial({
            color: colorFrom(String(c.params.accent ?? "#7c5cff"), "#7c5cff"),
            metalness: 0.35,
            roughness: 0.28,
            emissive: colorFrom(String(c.params.ink ?? "#f0eaff"), "#f0eaff"),
            emissiveIntensity: 0.08,
          }),
        );
        mesh.name = "depth-cube";
        c.scene.add(mesh);

        // Small orbiting satellite for depth / motion variance
        const sat = new T.Mesh(
          new T.SphereGeometry(0.18, 24, 16),
          new T.MeshStandardMaterial({
            color: colorFrom(String(c.params.ink ?? "#f0eaff"), "#f0eaff"),
            metalness: 0.5,
            roughness: 0.25,
          }),
        );
        sat.name = "depth-sat";
        c.scene.add(sat);

        c.camera.position.set(1.75, 1.35, 2.35);
        c.camera.lookAt(0, 0, 0);
      },
      draw(c) {
        c.setBackground(String(c.params.bg ?? "#0a0a12"));
        const speed = Number(c.params.speed ?? 1);
        const intensity = Number(c.params.intensity ?? 0.7);
        const cube =
          mesh ??
          (c.scene.getObjectByName("depth-cube") as THREE.Mesh | null);
        const sat = c.scene.getObjectByName("depth-sat") as THREE.Mesh | null;
        const rim = c.scene.getObjectByName(
          "rim-light",
        ) as THREE.DirectionalLight | null;

        if (cube) {
          cube.rotation.x = c.time * 0.5 * speed * (0.6 + intensity * 0.5);
          cube.rotation.y = c.time * 0.85 * speed;
          const mat = cube.material as THREE.MeshStandardMaterial;
          if (mat?.color) {
            mat.color.copy(
              colorFrom(String(c.params.accent ?? "#7c5cff"), "#7c5cff"),
            );
          }
          if (mat && "emissive" in mat) {
            mat.emissive.copy(
              colorFrom(String(c.params.ink ?? "#f0eaff"), "#f0eaff"),
            );
            mat.emissiveIntensity = 0.05 + intensity * 0.12;
          }
        }
        if (sat) {
          const r = 1.35 + intensity * 0.15;
          sat.position.set(
            Math.cos(c.time * speed * 1.2) * r,
            Math.sin(c.time * speed * 0.9) * 0.45,
            Math.sin(c.time * speed * 1.2) * r,
          );
          const sm = sat.material as THREE.MeshStandardMaterial;
          if (sm?.color) {
            sm.color.copy(
              colorFrom(String(c.params.ink ?? "#f0eaff"), "#f0eaff"),
            );
          }
        }
        if (rim) {
          rim.color.copy(
            colorFrom(String(c.params.ink ?? "#f0eaff"), "#f0eaff"),
          );
          rim.intensity = 0.35 + intensity * 0.4;
        }
      },
      dispose() {
        mesh = null;
      },
    },
    { aspect: "1:1", autoDpr: true },
  );

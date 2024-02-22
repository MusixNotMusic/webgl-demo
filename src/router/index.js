import { createRouter, createWebHashHistory } from "vue-router";

const routes= [
  { path: "/", redirect: "/index" },
  {
    path: "/index",
    name: "index",
    redirect: "/FlowFieldWindNext",
    component: () => import("../components/Index.vue"),
    children: [
      {
        path: "/MapboxShader",
        name: "MapboxShader",
        component: () => import("../components/Three/MapboxShader.vue"),
      },
      {
        path: "/MapboxVolume3d",
        name: "MapboxVolume3d",
        component: () => import("../components/Three/MapboxVolume3d.vue"),
      },
      {
        path: "/MapboxVolume3dThreeBox",
        name: "MapboxVolume3dThreeBox",
        component: () => import("../components/Three/MapboxVolume3dThreeBox.vue"),
      },
      {
        path: "/VolumeRender2",
        name: "VolumeRender2",
        component: () => import("../components/Three/VolumeRender2.vue"),
      },
      {
        path: "/CAPPI",
        name: "CAPPI",
        component: () => import("../components/Three/CAPPI.vue"),
      },
      {
        path: "/demo2",
        name: "demo2",
        component: () => import("../components/Three/demo2.vue"),
      },
      {
        path: "/global",
        name: "global",
        component: () => import("../components/Three/GlobalRadar3D.vue"),
      },
      {
        path: "/BoundsCenter",
        name: "BoundsCenter",
        component: () => import("../components/Three/BoundsCenter.vue"),
      },
      {
        path: "/NortheastChinaColdVortex",
        name: "NortheastChinaColdVortex",
        component: () => import("../components/Three/NortheastChinaColdVortex.vue"),
      },

      {
        path: "/Cloud",
        name: "Cloud",
        component: () => import("../components/Atmosphere/Cloud.vue"),
      },
      {
        path: "/Weather",
        name: "Weather",
        component: () => import("../components/Atmosphere/Weather.vue"),
      },
      {
        path: "/WindFieldArrows",
        name: "WindFieldArrows",
        component: () => import("../components/Atmosphere/WindFieldArrows.vue"),
      },
      {
        path: "/FlowFieldWindNext",
        name: "FlowFieldWindNext",
        component: () => import("../components/Atmosphere/FlowFieldWindNext/FlowFieldWindNext.vue"),
      },
      {
        path: "/Isosurface",
        name: "Isosurface",
        component: () => import("../components/Three/Isosurface.vue"),
      },
      {
        path: "/WebGPU",
        name: "WebGPU",
        redirect: "/Triangle",
        component: () => import("../components/WebGPU/Index.vue"),
        children: [
          {
            path: "/Triangle",
            name: "Triangle",
            component: () => import("../components/WebGPU/Triangle.vue"),
          },
        ]
      },
      {
        path: "/Model",
        name: "Model",
        component: () => import("../components/ModelLoad/Demo.vue"),
      },
      {
        path: "/GeoJsonIO",
        name: "GeoJsonIO",
        component: () => import("../components/GeoJsonIO/GeoJsonIO.vue"),
      },
      {
        path: "/FlowFiled",
        name: "FlowFiled",
        component: () => import("../components/Emulation/FlowFiled.vue"),
      },
    ],
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  linkActiveClass: "active",
});

export default router;

import { createRouter, createWebHashHistory } from "vue-router";

const routes= [
  { path: "/", redirect: "/index" },
  {
    path: "/index",
    name: "index",
    redirect: "/MapboxShader",
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
      }
    ],
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  linkActiveClass: "active",
});

export default router;

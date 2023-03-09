import { createRouter, createWebHashHistory } from "vue-router";

const routes= [
  { path: "/", redirect: "/index" },
  {
    path: "/index",
    name: "index",
    component: () => import("../components/Index.vue"),
    children: [
      {
        path: "/MapboxVolume3d",
        name: "MapboxVolume3d",
        component: () => import("../components/Three/MapboxVolume3d.vue"),
      },
      {
        path: "/MapboxVolume3dThreeBox",
        name: "MapboxVolume3dThreeBox",
        component: () => import("../components/Three/MapboxVolume3dThreeBox.vue"),
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

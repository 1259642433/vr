import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    redirect: '/vrlive'
  },
  {
    path: '/home',
    name: 'Home',
    component: () => import('../views/Home.vue')
  }, {
    path: '/live',
    name: 'Live',
    component: () => import('../views/Live')
  }, {
    path: '/vrlive',
    name: 'VRLive',
    component: () => import('../views/VRLive')
  }, {
    path: '/test',
    name: 'Test',
    component: () => import('../views/Test')
  }
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

export default router

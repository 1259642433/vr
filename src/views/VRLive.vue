<template>
    <div class="vr-live">
        <vr-live :option="opt"></vr-live>
    </div>
</template>

<script>
import vrLive from '@c/VRLive'
export default {
  components: {
    vrLive
  },
  data () {
    return {
      opt: {
        source: {
        /*
          视频类型
          Normal
          HLS
          FLV
        */
          type: 'FLV',
          /*
          测试地址
          https://www.wangwentehappy.tk/assets/video/1.mp4
          http://localhost:8000/wwt/.flv
          http://localhost:8000/wwt/.m3u8
          */
          url: 'http://localhost:8000/wwt/.flv'
        }
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.vr-live{

}
</style>

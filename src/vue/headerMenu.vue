<template>
  <ul id="headerRight">
    <li class="headerButton">
      <ui-button type="secondary" raised color="primary"
                 @click="loadScene">
        Load Scene
      </ui-button>
      <ui-button type="secondary" raised color="primary"
                 @click="saveScene">
        Export Scene
      </ui-button>
      <ui-button type="secondary" raised color="primary"
                 @click="clearScene">
        Clear
      </ui-button>
      <ui-button type="secondary" raised color="primary"
                 open-dropdown-on="hover" has-dropdown ref="dropdownButton">
        <ui-menu v-show="canvasManager.isRendering2d"
                 slot="dropdown" :options="canvasManager.scene2d.presets"
                 @select="presetSelected2d"
                 @close="$refs.dropdownButton.closeDropdown()"/>
        <ui-menu v-show="canvasManager.isRendering3d"
                 slot="dropdown" :options="canvasManager.scene3d.presets"
                 @select="presetSelected3d"
                 @close="$refs.dropdownButton.closeDropdown()"/>
        Load Preset
      </ui-button>
    </li>
  </ul>
</template>

<script>
import UiMenu from 'keen-ui/lib/UiMenu';
import UiButton from 'keen-ui/lib/UiButton';
export default {
    props: ['canvasManager'],
    components: {
        UiButton,
        UiMenu
    },
    methods: {
        clearScene() {
            this.canvasManager.clearCurrentScene();
        },
        presetSelected2d(preset) {
            this.canvasManager.scene2d.load(preset);
            this.canvasManager.canvas2d.compileRenderShader();
            this.canvasManager.canvas2d.render();
        },
        presetSelected3d(preset) {
            this.canvasManager.scene3d.load(preset);
            this.canvasManager.canvas3dGen.compileRenderShader();
            this.canvasManager.canvas3dGen.render();
            this.canvasManager.canvas3dOrb.compileRenderShader();
            this.canvasManager.canvas3dOrb.render();
        },
        saveScene() {
            this.canvasManager.saveScene();
        },
        loadScene() {
            this.canvasManager.loadSceneFromFile();
        }
    }
}
</script>

<style>
#headerRight {
    margin: 0;
    padding: 0;
    display: flex;
    align-items: center;

    list-style: none;
    height: 100%;
}

.headerButton {
    display: flex;
    align-items: center;
    height: 100%;
    padding-right: 5px;
}

</style>

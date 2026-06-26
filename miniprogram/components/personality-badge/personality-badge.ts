// 人格标签展示组件

Component({
  properties: {
    primaryTag: { type: String, value: '' },
    primaryIcon: { type: String, value: '' },
    secondaryTags: { type: Array, value: [] },
    size: { type: String, value: 'medium' }, // 'small' | 'medium' | 'large'
    loading: { type: Boolean, value: false },
  },

  methods: {
    onTap(): void {
      this.triggerEvent('badgetap', {
        tag: this.properties.primaryTag,
        icon: this.properties.primaryIcon,
      });
    },
  },
});

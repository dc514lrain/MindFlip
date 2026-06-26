// 工具卡片通用组件

Component({
  properties: {
    toolId: { type: String, value: '' },
    name: { type: String, value: '' },
    description: { type: String, value: '' },
    icon: { type: String, value: '' },
    route: { type: String, value: '' },
  },

  methods: {
    onTap(): void {
      this.triggerEvent('cardtap', {
        toolId: this.properties.toolId,
        route: this.properties.route,
      });
    },
  },
});

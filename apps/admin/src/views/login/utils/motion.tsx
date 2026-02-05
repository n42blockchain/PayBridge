import { defineComponent, type PropType } from "vue";

export default defineComponent({
  name: "Motion",
  props: {
    delay: {
      type: Number as PropType<number>,
      default: 50
    }
  },
  setup(props, { slots }) {
    return () => (
      <div
        v-motion
        initial={{
          opacity: 0,
          y: 100
        }}
        enter={{
          opacity: 1,
          y: 0,
          transition: {
            delay: props.delay
          }
        }}
      >
        {slots.default?.()}
      </div>
    );
  }
});

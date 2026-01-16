class SpacerNode:
    """
    UI Spacer Decorator

    Inputs:
      - spacer: UI_SPACER (exposed to subgraph outer node)

    Behavior:
      - Height (pixels) controlled by JS on this node.
      - Height is mirrored to the direct parent subgraph node.
      - Outer display order is controlled by user reorder UI.
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "spacer": ("UI_SPACER", {"default": 20}),
            }
        }

    RETURN_TYPES = ()
    FUNCTION = "out"
    CATEGORY = "Custom/UI Decorators"
    OUTPUT_NODE = True

    def out(self, spacer):
        return ()
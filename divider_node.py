class DividerNode:
    """
    UI Divider Decorator (standalone BVortex-like divider)

    Inputs:
      - divider: UI_SUB_DIVIDER (exposed to subgraph outer node)

    Behavior:
      - Divider color controlled by JS on this node.
      - Color is mirrored to the direct parent subgraph node.
      - Outer display order is controlled by user reorder UI.
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "divider": ("UI_SUB_DIVIDER", {}),
            }
        }

    RETURN_TYPES = ()
    FUNCTION = "out"
    CATEGORY = "Custom/UI Decorators"
    OUTPUT_NODE = True

    def out(self, divider):
        return ()

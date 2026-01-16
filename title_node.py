class TitleNode:
    """
    UI Title Decorator

    Inputs:
      - title: UI_SUB_TITLE (exposed to subgraph outer node)

    Behavior:
      - Title styling controlled by JS on this node.
      - Styling is mirrored to the direct parent subgraph node.
      - Outer display order is controlled by user reorder UI.
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "title": ("UI_SUB_TITLE", {"default": "Section Title"}),
            }
        }

    RETURN_TYPES = ()
    FUNCTION = "out"
    CATEGORY = "Custom/UI Decorators"
    OUTPUT_NODE = True

    def out(self, title):
        return ()

class NoteNode:
    """
    UI Note Decorator

    Inputs:
      - note: UI_NOTE (exposed to subgraph outer node)

    Behavior:
      - Text content, color, and font size controlled by JS on this node.
      - Properties are mirrored to the direct parent subgraph node via index matching.
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "note": ("UI_NOTE", {}),
            }
        }

    RETURN_TYPES = ()
    FUNCTION = "out"
    CATEGORY = "Custom/UI Decorators"
    OUTPUT_NODE = True

    def out(self, note):
        return ()
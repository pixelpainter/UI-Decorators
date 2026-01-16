from .title_node import TitleNode
from .divider_node import DividerNode
from .spacer_node import SpacerNode
from .note_node import NoteNode

NODE_CLASS_MAPPINGS = {
    "TitleNode": TitleNode,
    "DividerNode": DividerNode,
    "SpacerNode": SpacerNode,
    "NoteNode": NoteNode,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "TitleNode": "UI Title",
    "DividerNode": "UI Divider",
    "SpacerNode": "UI Spacer",
    "NoteNode": "UI Note",
}

WEB_DIRECTORY = "./js"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
"""AgentSDK protocol and options — SDK contract for agent execution."""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, AsyncIterator, List, Protocol, Union


# ---------------------------------------------------------------------------
# SDK message types — normalized message format yielded by AgentSDK.query
# ---------------------------------------------------------------------------

@dataclass
class AgentSdkTextBlock:
    text: str


@dataclass
class AgentSdkToolUseBlock:
    name: str
    input: Any


@dataclass
class AgentSdkAssistantMessage:
    model: str
    content: List[Union[AgentSdkTextBlock, AgentSdkToolUseBlock]] = field(default_factory=list)


@dataclass
class AgentSdkResultMessage:
    total_cost_usd: float


AgentSdkMessage = Union[
    AgentSdkAssistantMessage,
    AgentSdkResultMessage
]


# ---------------------------------------------------------------------------
# SDK options and protocol
# ---------------------------------------------------------------------------

class AgentSDKPermissionMode(str, Enum):
    BYPASS_PERMISSIONS = "bypassPermissions"
    DEFAULT = "default"


@dataclass
class AgentSDKOptions:
    permission_mode: AgentSDKPermissionMode
    max_turns: int


class AgentSDK(Protocol):
    def query(
            self,
            prompt: str,
            system: str,
            tools: list,
            options: AgentSDKOptions,
    ) -> AsyncIterator[AgentSdkMessage]: ...

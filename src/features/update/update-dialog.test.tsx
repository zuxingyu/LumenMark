import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { messages } from "../../i18n";
import { UpdateDialog } from "./UpdateDialog";

describe("UpdateDialog", () => {
  it("reports the no-update state without offering installation", () => {
    render(
      <UpdateDialog
        labels={messages["zh-CN"]}
        state={{ kind: "idle", update: null, progress: 0 }}
        onClose={() => undefined}
        onInstall={() => undefined}
        onRelaunch={() => undefined}
      />,
    );

    expect(screen.getByText("当前已是最新版本。")).toBeVisible();
    expect(screen.queryByRole("button", { name: "下载并安装" })).not.toBeInTheDocument();
  });

  it("lets the user start installation when an update is available", async () => {
    const onInstall = vi.fn();
    render(
      <UpdateDialog
        labels={messages["zh-CN"]}
        state={{
          kind: "available",
          update: { version: "0.3.12", body: "修复主题", date: "2026-06-01T00:00:00Z" },
          progress: 0,
        }}
        onClose={() => undefined}
        onInstall={onInstall}
        onRelaunch={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "下载并安装" }));

    await waitFor(() => expect(onInstall).toHaveBeenCalled());
  });
});

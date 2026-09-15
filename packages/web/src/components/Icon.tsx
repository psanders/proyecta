/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
// Material Symbols Sharp, the icon set used in design/pencil.pen.
import accountBalance from "@material-symbols/svg-400/sharp/account_balance.svg?raw";
import android from "@material-symbols/svg-400/sharp/android.svg?raw";
import arrowForward from "@material-symbols/svg-400/sharp/arrow_forward.svg?raw";
import call from "@material-symbols/svg-400/sharp/call.svg?raw";
import campaign from "@material-symbols/svg-400/sharp/campaign.svg?raw";
import cast from "@material-symbols/svg-400/sharp/cast.svg?raw";
import chat from "@material-symbols/svg-400/sharp/chat.svg?raw";
import check from "@material-symbols/svg-400/sharp/check.svg?raw";
import chevronDown from "@material-symbols/svg-400/sharp/keyboard_arrow_down.svg?raw";
import close from "@material-symbols/svg-400/sharp/close.svg?raw";
import desktopWindows from "@material-symbols/svg-400/sharp/desktop_windows.svg?raw";
import dragPan from "@material-symbols/svg-400/sharp/drag_pan.svg?raw";
import factCheck from "@material-symbols/svg-400/sharp/fact_check.svg?raw";
import help from "@material-symbols/svg-400/sharp/help.svg?raw";
import laptopChromebook from "@material-symbols/svg-400/sharp/laptop_chromebook.svg?raw";
import link from "@material-symbols/svg-400/sharp/link.svg?raw";
import map from "@material-symbols/svg-400/sharp/map.svg?raw";
import memory from "@material-symbols/svg-400/sharp/memory.svg?raw";
import menu from "@material-symbols/svg-400/sharp/menu.svg?raw";
import tv from "@material-symbols/svg-400/sharp/tv.svg?raw";
import upload from "@material-symbols/svg-400/sharp/upload.svg?raw";
import usb from "@material-symbols/svg-400/sharp/usb.svg?raw";
import wifiOff from "@material-symbols/svg-400/sharp/wifi_off.svg?raw";

const ICONS = {
  accountBalance,
  android,
  arrowForward,
  call,
  campaign,
  cast,
  chat,
  check,
  chevronDown,
  close,
  desktopWindows,
  dragPan,
  factCheck,
  help,
  laptopChromebook,
  link,
  map,
  memory,
  menu,
  tv,
  upload,
  usb,
  wifiOff
} as const;

export type IconName = keyof typeof ICONS;

/** Inline, bundled SVG icon (trusted static assets only). Size and color via Tailwind. */
export function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  return (
    <span
      aria-hidden
      className={`icon inline-block shrink-0 ${className}`}
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  );
}

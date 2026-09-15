/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
// Material Symbols Sharp, the icon set used in design/pencil.pen.
import add from "@material-symbols/svg-400/sharp/add.svg?raw";
import archive from "@material-symbols/svg-400/sharp/inventory_2.svg?raw";
import arrowBack from "@material-symbols/svg-400/sharp/arrow_back.svg?raw";
import check from "@material-symbols/svg-400/sharp/check.svg?raw";
import checkCircle from "@material-symbols/svg-400/sharp/check_circle.svg?raw";
import chevronDown from "@material-symbols/svg-400/sharp/keyboard_arrow_down.svg?raw";
import chevronRight from "@material-symbols/svg-400/sharp/chevron_right.svg?raw";
import barChart from "@material-symbols/svg-400/sharp/bar_chart.svg?raw";
import close from "@material-symbols/svg-400/sharp/close.svg?raw";
import copy from "@material-symbols/svg-400/sharp/content_copy.svg?raw";
import deleteIcon from "@material-symbols/svg-400/sharp/delete.svg?raw";
import download from "@material-symbols/svg-400/sharp/download.svg?raw";
import error from "@material-symbols/svg-400/sharp/error.svg?raw";
import group from "@material-symbols/svg-400/sharp/group.svg?raw";
import info from "@material-symbols/svg-400/sharp/info.svg?raw";
import leftPanelClose from "@material-symbols/svg-400/sharp/left_panel_close.svg?raw";
import leftPanelOpen from "@material-symbols/svg-400/sharp/left_panel_open.svg?raw";
import link from "@material-symbols/svg-400/sharp/link.svg?raw";
import linkOff from "@material-symbols/svg-400/sharp/link_off.svg?raw";
import location from "@material-symbols/svg-400/sharp/location_on.svg?raw";
import logout from "@material-symbols/svg-400/sharp/logout.svg?raw";
import mail from "@material-symbols/svg-400/sharp/mail.svg?raw";
import moreVert from "@material-symbols/svg-400/sharp/more_vert.svg?raw";
import pause from "@material-symbols/svg-400/sharp/pause.svg?raw";
import person from "@material-symbols/svg-400/sharp/person.svg?raw";
import refresh from "@material-symbols/svg-400/sharp/refresh.svg?raw";
import schedule from "@material-symbols/svg-400/sharp/schedule.svg?raw";
import settings from "@material-symbols/svg-400/sharp/settings.svg?raw";
import spinner from "@material-symbols/svg-400/sharp/progress_activity.svg?raw";
import storefront from "@material-symbols/svg-400/sharp/storefront.svg?raw";
import swap from "@material-symbols/svg-400/sharp/swap_horiz.svg?raw";
import tv from "@material-symbols/svg-400/sharp/tv.svg?raw";
import unarchive from "@material-symbols/svg-400/sharp/unarchive.svg?raw";
import warning from "@material-symbols/svg-400/sharp/warning.svg?raw";

const ICONS = {
  add,
  archive,
  barChart,
  arrowBack,
  check,
  checkCircle,
  chevronDown,
  chevronRight,
  close,
  copy,
  delete: deleteIcon,
  download,
  error,
  group,
  info,
  leftPanelClose,
  leftPanelOpen,
  link,
  linkOff,
  location,
  logout,
  mail,
  moreVert,
  pause,
  person,
  refresh,
  schedule,
  settings,
  spinner,
  storefront,
  swap,
  tv,
  unarchive,
  warning
} as const;

export type IconName = keyof typeof ICONS;

/** Inline, bundled SVG icon (trusted static assets only). Size via Tailwind (e.g. size-5). */
export function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  return (
    <span
      aria-hidden
      className={`icon inline-block shrink-0 ${className}`}
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  );
}

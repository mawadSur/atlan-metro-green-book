tell application "Google Chrome" to activate
delay 0.2
tell application "System Events"
  tell process "Google Chrome"
    click menu bar item "View" of menu bar 1
    delay 0.1
    click menu item "Developer" of menu "View" of menu bar item "View" of menu bar 1
    delay 0.1
    set out to ""
    repeat with mi in menu items of menu "Developer" of menu item "Developer" of menu "View" of menu bar item "View" of menu bar 1
      set out to out & (name of mi as text) & "|enabled=" & ((enabled of mi) as text) & "|mark=" & ((value of attribute "AXMenuItemMarkChar" of mi) as text) & linefeed
    end repeat
    key code 53
    return out
  end tell
end tell

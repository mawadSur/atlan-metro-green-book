tell application "Google Chrome"
  repeat with wi from 1 to count of windows
    set w to window wi
    repeat with ti from 1 to count of tabs of w
      if (URL of tab ti of w) contains "287cc443-f94a-4c5d-9a9c-4b39ac451a6c" then
        set active tab index of w to ti
        set index of w to 1
        activate
        delay 0.5
        tell application "System Events"
          keystroke "a" using command down
          delay 0.2
          keystroke "c" using command down
          delay 0.5
        end tell
        return the clipboard
      end if
    end repeat
  end repeat
end tell
return "NOT_FOUND"

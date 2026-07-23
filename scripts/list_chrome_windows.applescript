tell application "System Events"
  tell process "Google Chrome"
    set out to ""
    repeat with i from 1 to count of windows
      try
        set nm to name of window i
        set mn to value of attribute "AXMinimized" of window i
        set out to out & (i as text) & ": " & nm & " minimized=" & (mn as text) & linefeed
      end try
    end repeat
    return out
  end tell
end tell

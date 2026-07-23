tell application "Google Chrome"
  set out to ""
  repeat with wi from 1 to count of windows
    set w to window wi
    set out to out & "WINDOW " & wi & " active=" & active tab index of w & " title=" & title of active tab of w & linefeed
    repeat with ti from 1 to count of tabs of w
      set marker to "  "
      if ti is (active tab index of w) then set marker to "* "
      set out to out & marker & ti & ": " & title of tab ti of w & " | " & URL of tab ti of w & linefeed
    end repeat
  end repeat
  return out
end tell

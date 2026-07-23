tell application "iPhone Mirroring" to activate
delay 1
tell application "System Events"
  tell process "iPhone Mirroring"
    set out to "windows: " & (count of windows as text) & linefeed
    repeat with w in windows
      set out to out & "WINDOW " & (name of w as text) & " pos=" & (position of w as text) & " size=" & (size of w as text) & linefeed
      repeat with e in entire contents of w
        try
          set out to out & (role of e as text) & " | " & (name of e as text) & " | " & (description of e as text) & linefeed
        end try
      end repeat
    end repeat
    if (length of out) > 8000 then return text 1 thru 8000 of out
    return out
  end tell
end tell

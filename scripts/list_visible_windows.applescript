tell application "System Events"
  set out to ""
  repeat with p in processes whose background only is false
    try
      repeat with w in windows of p
        set out to out & (name of p as text) & " | " & (name of w as text) & " | " & (position of w as text) & " | " & (size of w as text) & linefeed
      end repeat
    end try
  end repeat
  return out
end tell

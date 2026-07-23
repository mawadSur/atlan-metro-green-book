tell application "Google Chrome"
  repeat with wi from 1 to count of windows
    set w to window wi
    repeat with ti from 1 to count of tabs of w
      if (URL of tab ti of w) contains "287cc443-f94a-4c5d-9a9c-4b39ac451a6c" then
        set theTitle to title of tab ti of w
        try
          set theText to execute tab ti of w javascript "document.body ? document.body.innerText.slice(0, 6000) : ''"
        on error errMsg
          set theText to "JS_ERROR: " & errMsg
        end try
        return "TITLE: " & theTitle & linefeed & "TEXT:" & linefeed & theText
      end if
    end repeat
  end repeat
end tell
return "NOT_FOUND"

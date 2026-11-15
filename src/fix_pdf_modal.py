import re

app_path = "src/App.jsx"
with open(app_path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Boost PDF Viewer Modal Z-Index to 9999 so nothing bleeds through
code = code.replace(
    'className="fixed inset-0 z-50 bg-[#008080] p-2 flex flex-col justify-between"',
    'className="fixed inset-0 z-[9999] pdf-modal-backdrop bg-[#008080] p-2 flex flex-col justify-between"'
)

code = code.replace(
    'className="fixed inset-0 z-50 bg-[#121212] flex flex-col items-center overflow-y-auto"',
    'className="fixed inset-0 z-[9999] bg-[#121212] flex flex-col items-center overflow-y-auto"'
)

# 2. Add pdf-win-frame class to PDF modal container
code = code.replace(
    'className="w-full max-w-lg mx-auto bg-[#c0c0c0] border-2 border-t-white border-l-white border-b-black border-r-black shadow-[4px_4px_0px_#000] flex-1 flex flex-col overflow-hidden my-auto"',
    'className="main-win-frame pdf-win-frame w-full max-w-lg mx-auto bg-[#c0c0c0] border-2 border-t-white border-l-white border-b-black border-r-black shadow-[4px_4px_0px_#000] flex-1 flex flex-col overflow-hidden my-auto"'
)

with open(app_path, "w", encoding="utf-8") as f:
    f.write(code)
print("1. src/App.jsx: PDF Modal elevated to z-[9999] (leak destroyed)!")


# 3. Add High Contrast 98 rules for PDF Viewer in win98.css
css_path = "src/win98.css"
with open(css_path, "r", encoding="utf-8") as f:
    css = f.read()

hc_pdf_rules = """
/* HIGH CONTRAST 98 - PDF VIEWER THEME ALIGNMENT */
body[data-theme="win98-hc"] .pdf-modal-backdrop {
  background-color: #000000 !important;
}
body[data-theme="win98-hc"] .pdf-win-frame {
  background-color: #000000 !important;
  border: 2px solid #00ff00 !important;
}
body[data-theme="win98-hc"] .pdf-win-frame .bg-\\[\\#c0c0c0\\] {
  background-color: #000000 !important;
  border-color: #00ff00 !important;
  color: #ffff00 !important;
}
body[data-theme="win98-hc"] .pdf-win-frame .bg-\\[\\#808080\\] {
  background-color: #050505 !important;
  border-color: #00ff00 !important;
}
"""

if "pdf-modal-backdrop" not in css:
    css += hc_pdf_rules
    with open(css_path, "w", encoding="utf-8") as f:
        f.write(css)
    print("2. src/win98.css: High Contrast rules added for PDF viewer!")

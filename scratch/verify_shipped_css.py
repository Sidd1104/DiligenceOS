import requests

url = "http://localhost:3000/login"
resp = requests.get(url)
print("HTTP Status Code:", resp.status_code)
html = resp.text

print("Contains 'max-w-[475px]':", "max-w-[475px]" in html)
print("Contains 'py-3.5':", "py-3.5" in html)
print("Contains 'mx-auto':", "mx-auto" in html)
print("\nHTML Snippet around form/card container:")
for line in html.split('\n'):
    if "max-w" in line or "input" in line or "form" in line or "rounded-2xl" in line:
        print("  ", line.strip())

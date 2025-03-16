import requests

url = 'https://javascript-minifier.com/raw'
data = {'input': open('calc.js', 'rb').read()}
response = requests.post(url, data=data)

print response.text

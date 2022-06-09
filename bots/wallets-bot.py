#Author: Gracious Mashasha
#for altcoinchanger.io
import time
import mysql.connector
import urllib.request, json
import requests


addresses_to_generate = 5
server_address = 'https://etrademarkets.com/index.php/'
rpc_server_address = 'http://localhost:8001/'

def do_generate_addresses():
    #get tokens
	#for each token check if addressed needed
	#if addresses needed, call rpac-api and generate addresses
	#post addresses to server
	url = server_address+"wallets/get_tokens/1"
	rpc_url = rpc_server_address+"addresses/generate"
	try:
		with urllib.request.urlopen(url) as json_response:
			data = json.loads(json_response.read())
		for token in data:
			print (token['symbol'])
			rpc_f_url = rpc_url +"?currency=" + token['symbol'] +"&count=" + str(addresses_to_generate)
			print(rpc_f_url)
			if(token['need_addresses'] == 1):
				try:
					with urllib.request.urlopen(rpc_f_url) as rpc_json_response:
						rpc_data = json.loads(rpc_json_response.read())
					
					print(rpc_data)
					if(rpc_data['status'] == "success"):
						print(rpc_data)
						post_url = server_address + "wallets/save_addresses"
						post_fields = {'address[]': rpc_data['address'],'currency':token['symbol']}
						
						response = requests.post(post_url, data=post_fields)			
						print(response.text)
				except:
					print("An error has occured")
	except:
		print("An error has occured")		
def do_process_deposit():
	#get tokens
	#for each token get a deposit
	#post new deposits to derver
	print("precess for deposits")

def run():
	while True:
		do_generate_addresses()
		do_process_deposit()

if __name__ == "__main__":
    run()
#Author: Gracious Mashasha
#for altcoinchanger.io
from bitcoinrpc.authproxy import AuthServiceProxy, JSONRPCException
import requests

server_address = 'https://etrademarkets.com/index.php/'
rpc_user = "user"
rpc_password = "Za45XVA1fJxtqVu"
currency = "GCCHD"
rpc_connection = AuthServiceProxy("http://%s:%s@127.0.0.1:38200"%(rpc_user,rpc_password))

def process_ltc_deposits():
	deposits = rpc_connection.listreceivedbyaddress(0)
	print(deposits)
	for deposit in deposits:
		#for txn in deposit['txids']:
			
		post_url = server_address + "wallets/process_deposit"
		post_fields = {'currency': currency,'transaction_id':deposit['address'],'address':deposit['address'],'amount':deposit['amount'],'confirmations':deposit['confirmations']}
		
		try:
			print(post_fields);
			response = requests.post(post_url, data=post_fields)			
			print(response.text)
		except:
			print("An error has occured")
			
def run():
	while True:
		process_ltc_deposits()

if __name__ == "__main__":
    run()
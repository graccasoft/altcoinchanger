#Author: Gracious Mashasha
#for altcoinchanger.io
import time
import mysql.connector
import urllib.request, json

#DB Variables
db_user = 'root'
db_password = ''
db_host = '127.0.0.1'
db_name = 'altcoin_changer'
#END  DB Variables

def do_matching():
    
	cnx = mysql.connector.connect(user=db_user, password=db_password,
                              host=db_host,
                              database=db_name,
							  buffered = True)
	
	pairs = cnx.cursor()		
	pairs.execute("SELECT id,cur1,cur2 FROM `pair` where active =1")
	for row in pairs.fetchall():
		url = "https://bleutrade.com/api/v2/public/getmarketsummary?market="+row[1]+"_"+row[2]
		print(url)
		with urllib.request.urlopen(url) as json_response:
			response = json_response.read()
		data = json.loads(response.read())
		print(data)
		
		#if search_sell_orders.rowcount > 0:
		
			#fill this buy order
			#update_buy_order = cnx.cursor()
			#update_buy_order.execute("update buy_order set filled = 1 where id = '"+str(row[0])+"'")
			#cnx.commit()
			#update_buy_order.close()
			#search_row = search_sell_orders.fetchone()
			#fill_sell_order(row[1], search_row[0])
				

	
def run():
	while True:
		do_matching()
		time.sleep(10)

if __name__ == "__main__":
    run()
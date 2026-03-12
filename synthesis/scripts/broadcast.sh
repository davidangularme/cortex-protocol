#!/bin/bash
# Usage: ./broadcast.sh <signed_tx_hex>
# Broadcasts a signed transaction and waits for receipt

SIGNED=$1
RPC="https://base.drpc.org"

if [ -z "$SIGNED" ]; then
  echo "❌ No signed tx provided"
  exit 1
fi

# Broadcast
RESULT=$(curl -s -X POST $RPC -H "Content-Type: application/json" -d "{\"jsonrpc\":\"2.0\",\"method\":\"eth_sendRawTransaction\",\"params\":[\"$SIGNED\"],\"id\":1}")

TX_HASH=$(echo "$RESULT" | python3 -c "import sys,json; r=json.load(sys.stdin); print(r.get('result','ERROR: '+str(r.get('error',{}).get('message',''))))" 2>/dev/null)

if [[ "$TX_HASH" == ERROR* ]]; then
  echo "❌ $TX_HASH"
  exit 1
fi

echo "⏳ Tx: $TX_HASH"

# Wait for receipt (max 15s)
for i in $(seq 1 15); do
  sleep 1
  RECEIPT=$(curl -s -X POST $RPC -H "Content-Type: application/json" -d "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getTransactionReceipt\",\"params\":[\"$TX_HASH\"],\"id\":1}")
  STATUS=$(echo "$RECEIPT" | python3 -c "import sys,json; r=json.load(sys.stdin)['result']; print('SUCCESS' if r and r['status']=='0x1' else 'FAIL' if r else 'PENDING')" 2>/dev/null)
  if [ "$STATUS" = "SUCCESS" ]; then
    GAS=$(echo "$RECEIPT" | python3 -c "import sys,json; r=json.load(sys.stdin)['result']; print(int(r['gasUsed'],16))" 2>/dev/null)
    echo "✅ Confirmed! Gas: $GAS"
    exit 0
  elif [ "$STATUS" = "FAIL" ]; then
    echo "❌ Transaction reverted"
    exit 1
  fi
done

echo "⏳ Still pending after 15s, check: https://basescan.org/tx/$TX_HASH"

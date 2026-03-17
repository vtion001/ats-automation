"""
CTM Webhook Handler
Receives call data from CallTrackingMetrics webhooks
"""

from flask import Flask, request, jsonify
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.route('/api/webhook/ctm', methods=['POST'])
def ctm_webhook():
    """Handle incoming CTM webhooks"""
    
    try:
        data = request.get_json()
        logger.info(f"CTM Webhook received: {data}")
        
        # Extract call data
        call_data = {
            'phone': data.get('caller_number', data.get('phone_number')),
            'caller_name': data.get('caller_name', data.get('name')),
            'duration': data.get('duration'),
            'recording_url': data.get('recording_url'),
            'transcript': data.get('transcript', ''),
            'status': data.get('status', 'completed'),
            'timestamp': data.get('timestamp'),
            'agent': data.get('agent_name')
        }
        
        logger.info(f"Call data: {call_data}")
        
        # Process the call - trigger automation
        # You can add logic here to process the transcript
        
        return jsonify({'status': 'received'}), 200
        
    except Exception as e:
        logger.error(f"Error processing webhook: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/webhook/ctm/test', methods=['GET'])
def ctm_test():
    """Test endpoint"""
    return jsonify({'status': 'ok', 'message': 'CTM webhook endpoint ready'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

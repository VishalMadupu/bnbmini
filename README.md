# Here are your Instructions
You can do it directly from Git Bash:

#### cmd to remove emergent integrations

sed -i '/^emergentintegrations==0\.2\.0$/d' requirements.txt

Then verify:

**grep -n "emergentintegrations" requirements.txt**

It should return nothing.

### Run cmd this project

**python -m uvicorn server:app --reload**

**npx craco start**
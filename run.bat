docker run -d ^
  -v my-volume:/app/data ^
  -p 5030:5030 ^
  -p 5031:5031 ^
  -p 50300:50300 ^
  -e SLSKD_REMOTE_CONFIGURATION=true ^
  -e SLSKD_SLSK_USERNAME=ABCSlime ^
  -e SLSKD_SLSK_PASSWORD=Anej1234! ^
  --name slskd ^
  slskd/slskd

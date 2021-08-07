FROM python:latest
WORKDIR /backend
COPY ./requirements.txt .
RUN pip install -r ./requirements.txt
CMD ["adev", "runserver", "server.py", "--port", "8080"]

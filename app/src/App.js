import React from 'react';
import MonacoEditor from 'react-monaco-editor';
import { Alert, Badge } from 'rsuite';

import './App.css';
import 'rsuite/dist/styles/rsuite-dark.css';

import restoreIcon from '../public/restore.png';
import closeIcon from '../public/close.png';
import maxIcon from '../public/max.png';
import minIcon from '../public/min.png';
import Icon from '../public/icon.png';
import Execute from "../public/play.png";

let INJECTED = false;
let CONNECTED = false;
let AUTOINJECT = false;
let status;

class App extends React.Component {
	constructor(props) {
		super(props);

		const socket = new WebSocket('ws://localhost:42772');

		socket.addEventListener('message', event => {
			const { op, data } = JSON.parse(event.data);

			switch (op) {
				case 'setEditor':
					const { value } = data;
					this.setState({value});
					if (this.state.openTab) {
						this.openTab(null);
					}
					break
				
				case 'error': 
					Alert.error(data.message, 5000);
					break
				case 'success':
					Alert.success(data.message, 5000);
					break
				case 'connectFailed':
					status.style.backgroundColor = "#f04f43";
					Alert.warning("Failed to connect to RO-EXEC servers", 5000);
					break
				case 'connected':
					Alert.success("Connected to RO-EXEC servers", 5000);
					status.style.backgroundColor = "#89f043";
					CONNECTED = true;
					break
				case 'disconnected':
					Alert.success("Disconnected from RO-EXEC servers", 5000);
					status.style.backgroundColor = "#f04f43";
					CONNECTED = false;
					break
				case 'injected':
					if (data.value && !INJECTED) {
						Alert.success("RO-EXEC was injected successfully", 5000);
					}

					if (!data.value && INJECTED) {
						Alert.warning("RO-EXEC was uninjected", 5000);
					}

					
					INJECTED = data.value;
					break
			}
		})
		
		window.socket = socket;

		this.onEditorChanged = this.onEditorChanged.bind(this);
		this.handleClick     = this.handleClick.bind(this);
		this.clearEditor     = this.clearEditor.bind(this);
		this.handleDrop      = this.handleDrop.bind(this);
		this.minimize        = this.minimize.bind(this);
		this.maximize        = this.maximize.bind(this);
		this.openFile        = this.openFile.bind(this);
		this.openTab         = this.openTab.bind(this);
		this.onHover         = this.onHover.bind(this);
		this.close           = this.close.bind(this);
		this.send            = this.send.bind(this);
		this.openDirectory   = this.openDirectory.bind(this);
		this.inject 		 = this.inject.bind(this);
		this.execute		 = this.execute.bind(this)
		this.reconnect	     = this.reconnect.bind(this);
		this.inject			 = this.inject.bind(this);
		this.disconnect		 = this.disconnect.bind(this);
		this.autoInject		 = this.autoInject.bind(this);
		this.closeRoblox	 = this.closeRoblox.bind(this);

		this.state = {
			maximized: false,
			refs: {
				files: React.createRef(),
				config: React.createRef()
			},
			value: `print("Hello World!")`
		}
	}

	handleDrop(event) {
		event.preventDefault();
		event.stopPropogation();
		console.log(event.dataTranser.files)
	}

	onEditorChanged(value) {
		this.setState({value});
	}

	handleClick(event) {
		if (this.openRef && !this.openRef.current.contains(event.target)) {
			this.state.openTab.style.visibility = 'hidden';
			this.setState({
				openTab: null
			})
			this.openRef = null;
		}
	}

	onHover(tab) {
		if (this.state.openTab && this.state.tabs[tab] != this.state.openTab) {
			this.openTab(tab);
		}
	}
	openTab(tab) {
		for (let tabName in this.state.tabs) {
			let entry = this.state.tabs[tabName];
			if (!entry) continue;

			entry.style.visibility = tabName == tab ? 'visible' : 'hidden';

			if (tabName == tab) {
				if (this.state.openTab == entry) {
					entry.style.visibility = 'hidden';
					this.setState({
						openTab: null,
					})
					this.openRef = null;
				} else {
					this.setState({
						openTab: entry
					})
					this.openRef = this.state.refs[tabName];
				}
			}
		}
	}

	send(op, data) {
		window.socket.send(JSON.stringify({op, data}));
	}

	minimize() {
		this.send('min', {});
	}

	maximize() {
		document.getElementById('max-png').src = this.state.maximized ? maxIcon : restoreIcon;
		this.send(this.state.maximized ? 'restore' : 'max', {});

		this.setState({
			maximized: !this.state.maximized
		})
	}

	close() {
		this.send('close', {});
	}

	componentDidMount() {
		Alert.config({top: 40});

		this.setState({
			tabs: {
				files: document.getElementById('file-tab'),
				config: document.getElementById('config-tab')
			}
		})

		status = document.getElementById('status');
		document.addEventListener('mousedown', this.handleClick);
	}

	openFile() {
		this.send('openFile', {});
	}

	openDirectory() {
		if (CONNECTED) return Alert.warning("RO-EXEC already configured");
		if (INJECTED) return Alert.warning("RO-EXEC is already injected!");
		this.send('openDirectory', {});
	}

	reconnect() {
		if (CONNECTED) return Alert.warning("RO-EXEC is already connected")
		if (INJECTED) return Alert.warning("RO-EXEC is already injected!")
		this.send('reconnect', {});
	}

	disconnect() {
		if (!CONNECTED) return Alert.warning("RO-EXEC is already disconnected!")
		this.send('disconnect', {});
	}

	clearEditor() {
		this.setState({value: ''});
		if (this.state.openTab) {
			this.openTab(null);
		}
	}

	inject() {
		if (INJECTED) return Alert.warning("RO-EXEC is already injected!");
		this.send('inject', {})
	}
	
	execute() {
		if (!INJECTED) return Alert.error("You need to inject RO-EXEC!");
		this.send('execute', { source: this.state.value })
	}

	autoInject() {
		AUTOINJECT = !AUTOINJECT;
		document.getElementById("autoinject").style.background = AUTOINJECT ? "#1c1c1e" : "none";
		this.send('autoinject', { value: AUTOINJECT });
	}

	closeRoblox() {
		this.send('closeroblox', {});
	}

	render() {
		return (
			<div id='wrapper'>
				<div id='tabs'>
					<div id='file-tab' ref={this.state.refs.files}>
						<button class='tab-entry' onClick={this.openFile}>
							<p class='tab-title'>Open File</p>
						</button>
						<button class='tab-entry' onClick={this.clearEditor}>
							<p class='tab-title'>Clear Editor</p>
						</button>
					</div>
					<div id='config-tab' ref={this.state.refs.config}>
						<button class='tab-entry' onClick={this.openDirectory}>
							<p class='tab-title'>Choose installation path</p>
						</button>
						<button class='tab-entry' onClick={this.reconnect}>
							<p class='tab-title'>Reconnect to RO-EXEC</p>
						</button>
						<button class='tab-entry' onClick={this.disconnect}>
							<p class='tab-title'>Disconnect from RO-EXEC</p>
						</button>
						<button class='tab-entry' onClick={this.closeRoblox}>
							<p class='tab-title'>Close roblox</p>
						</button>
						<button class='tab-entry' id="autoinject" onClick={this.autoInject}>
							<p class='tab-title'>Auto Inject</p>
						</button>
					</div>
				</div>
				
				<div id='title'>
					<p id='title-text'>loader.live</p>
					
					<div id='title-left'>
						<div id='icon-wrapper'>
							<img id='icon' src={Icon} />
						</div>
						<div id='navigation-wrapper'>
							<button id='file' class='button-left' onMouseOver={() => this.onHover('files')} onClick={() => this.openTab('files')}>File</button>
							<button id='config' class='button-left' onMouseOver={() => this.onHover('config')} onClick={() => this.openTab('config')}>Configuation</button>
							<button id='inject' class='button-left' onMouseOver={() => this.onHover('inject')} onClick={this.inject}>Inject</button>
						</div>
					</div>
					<div id='title-right'>
						<Badge color='red' id='status'></Badge>
						<div id='button-wrapper'>
							<button id='min' onClick={this.execute}><img id ='icon' src={Execute}/></button>
							<button id='min' onClick={this.minimize}><img id ='min-png' src={minIcon}/></button>
							<button id='max' onClick={this.maximize}><img id='max-png' src={maxIcon}/></button>
							<button id='close' onClick={this.close}><img id='close-png' src={closeIcon}/></button>
						</div>
					</div>
				</div>
				<div id='drag'></div>
				<div id='main'>
					<MonacoEditor 
						options={{
							automaticLayout: true,
							minimap: {
								enabled: false
							}
						}}
						theme='vs-dark'
						language='lua'
						value={this.state.value}
						onChange={this.onEditorChanged}
					/>
				</div>
			</div> 
		)
	}
}



export default App;

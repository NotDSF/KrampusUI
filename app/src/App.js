import React from 'react';
import MonacoEditor from 'react-monaco-editor';
import { Alert, Modal, Checkbox, Button } from 'rsuite';

import './App.css';
import 'rsuite/dist/styles/rsuite-dark.css';

import restoreIcon from '../public/restore.png';
import closeIcon from '../public/close.png';
import maxIcon from '../public/max.png';
import minIcon from '../public/min.png';
import Icon from '../public/icon.png';

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
					Alert.error(data.message);
					break

				case 'syntax':
					Alert.warning(data.message);
					break
			}
		})
		
		window.socket = socket;

		this.onEditorChanged = this.onEditorChanged.bind(this);
		this.updateBeautify  = this.updateBeautify.bind(this);
		this.constantDump    = this.constantDump.bind(this);
		this.updateMinify    = this.updateMinify.bind(this);
		this.handleClick     = this.handleClick.bind(this);
		this.clearEditor     = this.clearEditor.bind(this);
		this.grabPremium     = this.grabPremium.bind(this);
		this.handleDrop      = this.handleDrop.bind(this);
		this.minimize        = this.minimize.bind(this);
		this.maximize        = this.maximize.bind(this);
		this.beautify        = this.beautify.bind(this);
		this.openFile        = this.openFile.bind(this);
		this.openTab         = this.openTab.bind(this);
		this.onHover         = this.onHover.bind(this);
		this.minify          = this.minify.bind(this);
		this.close           = this.close.bind(this);
		this.send            = this.send.bind(this);


		this.state = {
			maximized: false,
			refs: {
				files: React.createRef(),
				tools: React.createRef(),
				beautify: React.createRef(),	
			},
			beautifyProps: {},
			minifyProps: {},
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
				tools: document.getElementById('tools-tab'),
				beautify: document.getElementById('beautify-tab')
			}
		})

		document.addEventListener('mousedown', this.handleClick);
	}

	openFile() {
		this.send('openFile', {});
	}

	clearEditor() {
		this.setState({value: ''});
		if (this.state.openTab) {
			this.openTab(null);
		}
	}

	grabPremium() {
		this.send('grabPremium', {source: this.state.value});
	}

	constantDump() {
		this.send('constantDump', {source: this.state.value});
	}

	updateBeautify(index, value) {
		let props = this.state.beautifyProps;
		props[index] = value;

		this.setState({
			beautifyProps: props
		})
	}

	beautify() {
		this.send('beautify', {
			options: this.state.beautifyProps,
			source: this.state.value
		})
	}

	updateMinify(index, value) {
		let props = this.state.minifyProps;
		props[index] = value;

		this.setState({
			minifyProps: props
		})
	}

	minify() {
		this.send('minify', {
			options: this.state.minifyProps,
			source: this.state.value
		})
	}
	render() {
		return (
			<div id='wrapper'>
				<Modal size='xs'show={this.state.showBeautify} onHide={() => this.setState({showBeautify: false})}>
					<Modal.Header>
						<Modal.Title>Beautify</Modal.Title>
					</Modal.Header>
					<Modal.Body>
						<Checkbox onChange={(value, checked) => this.updateBeautify('RenameVariables', checked)}>Rename Variables</Checkbox>
						<Checkbox onChange={(value, checked) => this.updateBeautify('RenameGlobals', checked)}>Rename Globals</Checkbox>
						<Checkbox onChange={(value, checked) => this.updateBeautify('SolveMath', checked)}>Solve Math</Checkbox>
					</Modal.Body>
					<Modal.Footer>
						<Button onClick={() => {}} appearance='primary' onClick={() => this.beautify()}>Beautify</Button>
						<Button onClick={() => this.setState({showBeautify: false})} appearance='subtle'>Cancel</Button>
					</Modal.Footer>
				</Modal>
				<Modal size='xs'show={this.state.showMinify} onHide={() => this.setState({showMinify: false})}>
					<Modal.Header>
						<Modal.Title>Minify</Modal.Title>
					</Modal.Header>
					<Modal.Body>
						<Checkbox onChange={(value, checked) => this.updateMinify('RenameVariables', checked)}>Rename Variables</Checkbox>
						<Checkbox onChange={(value, checked) => this.updateMinify('RenameGlobals', checked)}>Rename Globals</Checkbox>
						<Checkbox onChange={(value, checked) => this.updateMinify('SolveMath', checked)}>Solve Math</Checkbox>
					</Modal.Body>
					<Modal.Footer>
						<Button onClick={() => {}} appearance='primary' onClick={() => this.minify()}>Minify</Button>
						<Button onClick={() => this.setState({showMinify: false})} appearance='subtle'>Cancel</Button>
					</Modal.Footer>
				</Modal>
				<div id='tabs'>
					<div id='file-tab' ref={this.state.refs.files}>
						<button class='tab-entry' onClick={this.openFile}>
							<p class='tab-title'>Open File</p>
						</button>
						<button class='tab-entry' onClick={this.clearEditor}>
							<p class='tab-title'>Clear Editor</p>
						</button>
					</div>
					<div id='tools-tab' ref={this.state.refs.tools}>
						<button class='tab-entry' onClick={this.constantDump}>
							<p class='tab-title'>Dump Constants</p>
						</button>
						<button class='tab-entry' onClick={this.grabPremium}>
							<p class='tab-title'>Grab Premium Output</p>
						</button>
						<button class='tab-entry' onClick={() => {
							this.send('joinDiscord');
							if (this.state.openTab) {
								this.openTab(null);
							}
						}}>
							<p class='tab-title'>Join Discord</p>
						</button>
						<button class='tab-entry' onClick={() => {
							this.send('buyLuraph');
							if (this.state.openTab) {
								this.openTab(null);
							}
						}}>
							<p class='tab-title'>Purchase Luraph</p>
						</button>
					</div>
					<div id='beautify-tab' ref={this.state.refs.beautify}>
						<button class='tab-entry' onClick={() => this.setState({showBeautify: true})}>
							<p class='tab-title'>Beautify</p>
						</button>
						<button class='tab-entry'>
							<p class='tab-title' onClick={() => this.setState({showMinify: true})}>Minify</p>
						</button>
					</div>
				</div>
				<div id='title'>
					<p id='title-text'>PSU Tools - v2.0</p>
					<div id='title-left'>
						<div id='icon-wrapper'>
							<img id='icon' src={Icon} />
						</div>
						<div id='navigation-wrapper'>
							<button id='file' class='button-left' onMouseOver={() => this.onHover('files')} onClick={() => this.openTab('files')}>File</button>
							<button id='tools' class='button-left' onMouseOver={() => this.onHover('tools')} onClick={() => this.openTab('tools')}>Tools</button>
							<button id='beautify' class='button-left' onMouseOver={() => this.onHover('beautify')} onClick={() => this.openTab('beautify')}>Luamin</button>
						</div>
					</div>
					<div id='title-right'>
						<div id='button-wrapper'>
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
